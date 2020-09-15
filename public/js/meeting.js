import h from './helpers.js';

window.addEventListener('load', () => {

    const room = new URLSearchParams(window.location.search).get('room');
    const username = document.getElementById(`remote-name`).value;
    document.getElementById(`meetingRoom`).innerHTML = room;
    document.getElementById(`meetingURL`).innerHTML = window.location.href;
    document.getElementById(`meetingPWD`).innerHTML = new URLSearchParams(window.location.search).get('pwd');

    var pc = [];
    let socket = io('/stream');

    var socketId = '';
    var myStream = '';
    var screen = '';

    //Get user video by default
    getAndSetUserStream();

    socket.on('connect', () => {
        //set socketId
        socketId = socket.io.engine.id;

        socket.emit('join', {
            room: room,
            socketId: socketId
        });

        socket.on('new user', (data) => {
            socket.emit('newUserStart', {
                to: data.socketId,
                sender: socketId
            });
            pc.push(data.socketId);
            init(true, data.socketId);
            h.alert("success", `${username} joined the meeting!`, 'bottom-start');
        });

        socket.on('newUserStart', (data) => {
            pc.push(data.sender);
            init(false, data.sender);
            h.alert("success", `You joined the meeting!`, 'bottom-start');
        });

        socket.on('ice candidates', async (data) => {
            data.candidate ? await pc[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate)) : '';
        });

        socket.on('sdp', async (data) => {
            if (data.description.type === 'offer') {
                data.description ? await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description)) : '';

                h.getUserFullMedia().then(async (stream) => {
                    if (!document.getElementById('local').srcObject) {
                        h.setLocalStream(stream);
                    }
                    //save my stream
                    myStream = stream;

                    stream.getTracks().forEach((track) => {
                        pc[data.sender].addTrack(track, stream);
                    });

                    let answer = await pc[data.sender].createAnswer();

                    await pc[data.sender].setLocalDescription(answer);

                    socket.emit('sdp', {
                        description: pc[data.sender].localDescription,
                        to: data.sender,
                        sender: socketId
                    });
                }).catch((e) => {
                    console.error(e);
                });
            } else if (data.description.type === 'answer') {
                await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
            }
        });

        socket.on('chat', (data) => {
            h.addChat(data, 'remote');
        });

        socket.on('raiseHand', (data) => {
            h.alert("info", `${data.raiser} raised hand!`, 'top-start');
        });

        socket.on('file-receive-start', function (data) {
            receiveFileStart(data);
        });
        socket.on('file-receive-complete', function (data) {
            receiveFileComplete(data);
        });

        socket.on('user leave', (data) => {
            h.closeVideo(data.socketId);
            h.alert("error", `${username} left the meeting!`, 'bottom-start');
        });
    });

    function getAndSetUserStream() {
        h.getUserFullMedia().then((stream) => {
            //save my stream
            myStream = stream;
            h.setLocalStream(stream);
        }).catch((e) => {
            console.error(`stream error: ${ e }`);
        });
    }

    function init(createOffer, partnerID) {
        pc[partnerID] = new RTCPeerConnection(h.getIceServer());

        if (screen && screen.getTracks().length) {
            screen.getTracks().forEach((track) => {
                pc[partnerID].addTrack(track, screen);
            });
        } else if (myStream) {
            myStream.getTracks().forEach((track) => {
                pc[partnerID].addTrack(track, myStream);
            });
        } else {
            h.getUserFullMedia().then((stream) => {
                //save my stream
                myStream = stream;

                stream.getTracks().forEach((track) => {
                    pc[partnerID].addTrack(track, stream);
                });
                h.setLocalStream(stream);
            }).catch((e) => {
                console.error(`stream error: ${ e }`);
            });
        }

        //create offer
        if (createOffer) {
            pc[partnerID].onnegotiationneeded = async () => {
                let offer = await pc[partnerID].createOffer();

                await pc[partnerID].setLocalDescription(offer);

                socket.emit('sdp', {
                    description: pc[partnerID].localDescription,
                    to: partnerID,
                    sender: socketId
                });
            };
        }

        //send ice candidate to partnerIDs
        pc[partnerID].onicecandidate = ({
            candidate
        }) => {
            socket.emit('ice candidates', {
                candidate: candidate,
                to: partnerID,
                sender: socketId
            });
        };

        //add
        pc[partnerID].ontrack = (e) => {
            let str = e.streams[0];
            if (document.getElementById(`${ partnerID }-video`)) {
                document.getElementById(`${ partnerID }-video`).srcObject = str;
            } else {
                //create a new div for card
                let cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                cardDiv.id = partnerID;

                const innerDiv = `<video class="remote-video" id="${ partnerID }-video" autoplay playsinline></video>
                    <div class="remote-video-controls">
                        <div class"text-center">
                            <a id="${ partnerID }" class="remote_name text-white">${username}</a>
                        </div>
                    </div>`;

                cardDiv.innerHTML = innerDiv;
                document.getElementById('videos').appendChild(cardDiv);
                document.getElementById(`${ partnerID }-video`).srcObject = str;
                document.getElementById(`${ partnerID }-video`).removeAttribute('controls');

                h.adjustVideoElemSize();
            }
        };

        pc[partnerID].onconnectionstatechange = (d) => {
            switch (pc[partnerID].iceConnectionState) {
                case 'disconnected':
                case 'failed':
                    h.closeVideo(partnerID);
                    break;
                case 'closed':
                    h.closeVideo(partnerID);
                    break;
            }
        };

        pc[partnerID].onsignalingstatechange = (d) => {
            switch (pc[partnerID].signalingState) {
                case 'closed':
                    console.log("Signalling state is 'closed'");
                    h.closeVideo(partnerID);
                    break;
            }
        };
    }

    function sendMsg(msg) {
        let data = {
            room: room,
            msg: msg,
            sender: username
        };

        //emit chat message
        socket.emit('chat', data);

        //add localchat
        h.addChat(data, 'local');
    }

    function raisedHand() {
        let data = {
            room: room,
            raiser: username
        };

        //emit hand raised
        socket.emit('raiseHand', data);
        h.alert("info", `You raised hand!`, 'top-start');
    }

    function leaveMeeting() {
        let data = {
            socketId: socketId,
            room: room,
            sender: username
        };

        //emit hand raised
        socket.emit('user leave', data);
        h.alert("error", `You left the meeting!`, 'bottom-start');
    }

    //file sharing
    var file;
    var currentChunk;
    const BYTES_PER_CHUNK = 1200;
    var fileInput = $('input[type=file]');
    var fileReader = new FileReader();

    function readNextChunk() {
        var start = BYTES_PER_CHUNK * currentChunk;
        var end = Math.min(file.size, start + BYTES_PER_CHUNK);
        fileReader.readAsArrayBuffer(file.slice(start, end));
    }
    //file sending
    fileInput.on('change', function () {
        file = fileInput[0].files[0];
        currentChunk = 0;

        var fileData = JSON.stringify({
            fileName: file.name,
            fileSize: file.size
        })

        socket.emit('file-send-start', {
            room: room,
            file: fileData
        });

        readNextChunk();

        fileReader.onload = function () {
            let data = {
                room: room,
                file: fileReader.result
            };
            socket.emit('file-send-complete', data);

            currentChunk++;

            if (BYTES_PER_CHUNK * currentChunk < file.size) {
                readNextChunk();
            }
        }
        var blob = new Blob(fileInput);
        var url = window.URL.createObjectURL(blob);

        var finalFile = `<a href='${url}' download="${file.name}">${file.name}</a>`;

        let newData = {
            room: room,
            file: finalFile,
            sender: username
        };
        //add to chat
        h.addChat(newData, 'local');
    });

    // file receiving
    var incomingFileInfo;
    var incomingFileData;
    var bytesReceived;
    var downloadInProgress = false;

    function receiveFileStart(data) {
        incomingFileInfo = JSON.parse(data.toString());
        incomingFileData = [];
        bytesReceived = 0;
        downloadInProgress = true;
        console.log('incoming file <b>' + incomingFileInfo.fileName + '</b> of ' + incomingFileInfo.fileSize + ' bytes');
    }

    function receiveFileComplete(data) {
        bytesReceived += data.byteLength;
        incomingFileData.push(data);
        console.log('progress: ' + ((bytesReceived / incomingFileInfo.fileSize) * 100).toFixed(2) + '%');
        if (bytesReceived === incomingFileInfo.fileSize) {
            downloadInProgress = false;
            var blob = new Blob(incomingFileData);
            var url = window.URL.createObjectURL(blob);

            var finalFile = `<a href='${url}' download="${incomingFileInfo.fileName}">${incomingFileInfo.fileName}</a>`;
            let data = {
                room: room,
                file: finalFile,
                sender: username
            };
            //add to chat
            h.addChat(data, 'remote');
        }
    }

    //share screen
    function shareScreen() {
        h.shareScreen().then((stream) => {

            //toggle share Icon
            let shareIconElem = document.querySelector('#screenShare');
            shareIconElem.setAttribute('title', 'Stop sharing screen');
            shareIconElem.children[0].classList.add('text-primary');

            //disable the video toggle btns while sharing screen.
            document.getElementById("toggle-video").disabled = true;

            //save my screen stream
            screen = stream;

            //share the new stream with all partners
            broadcastNewTracks(stream, 'video', false);

            //When the stop sharing button shown by the browser is clicked
            screen.getVideoTracks()[0].addEventListener('ended', () => {
                stopSharingScreen();
            });
        }).catch((e) => {
            console.error(e);
        });
    }

    //stop sharing screen
    function stopSharingScreen() {
        //enable video toggle btn
        document.getElementById("toggle-video").disabled = false;

        return new Promise((res, rej) => {
            screen.getTracks().length ? screen.getTracks().forEach(track => track.stop()) : '';
            res();
        }).then(() => {
            //toggle share Icon
            let shareIconElem = document.querySelector('#screenShare');
            shareIconElem.setAttribute('title', 'Share screen');
            shareIconElem.children[0].classList.remove('text-primary');

            broadcastNewTracks(myStream, 'video');
        }).catch((e) => {
            console.error(e);
        });
    }

    function broadcastNewTracks(stream, type, mirrorMode = true) {
        h.setLocalStream(stream, mirrorMode);

        let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

        for (let p in pc) {
            let pName = pc[p];

            if (typeof pc[pName] == 'object') {
                h.replaceTrack(track, pc[pName]);
            }
        }
    }

    //Chat textarea
    document.getElementById('send-message').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && (e.target.value.trim())) {
            e.preventDefault();

            var msg = e.target.value;

            // Prevent cross site scripting
            msg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            // Make links clickable
            msg = msg.autoLink({
                target: "_blank",
                rel: "nofollow"
            });

            sendMsg(msg);

            setTimeout(() => {
                e.target.value = '';
                e.target.focus();
            }, 50);
        }
    });

    //When the video icon is clicked
    document.getElementById('toggle-video').addEventListener('click', (e) => {
        e.preventDefault();

        let elem = document.getElementById('toggle-video');

        if (myStream.getVideoTracks()[0].enabled) {
            const html = `<i class="fa fa-video-slash"></i>`
            elem.innerHTML = html;
            elem.setAttribute('title', 'Show Video');
            elem.classList.add('hide');

            myStream.getVideoTracks()[0].enabled = false;
        } else {
            const html = `<i class="fa fa-video"></i>`
            elem.innerHTML = html;
            elem.setAttribute('title', 'Hide Video');
            elem.classList.remove('hide');

            myStream.getVideoTracks()[0].enabled = true;
        }

        broadcastNewTracks(myStream, 'video');
    });

    //When the mute icon is clicked
    document.getElementById('toggle-mute').addEventListener('click', (e) => {
        e.preventDefault();

        let elem = document.getElementById('toggle-mute');
        if (myStream.getAudioTracks()[0].enabled) {
            const html = `<i class="fa fa-microphone-slash"></i>`
            elem.innerHTML = html;
            elem.setAttribute('title', 'Unmute');
            elem.classList.add('mute');

            myStream.getAudioTracks()[0].enabled = false;
        } else {
            const html = `<i class="fa fa-microphone"></i>`
            elem.innerHTML = html;
            elem.setAttribute('title', 'Mute');
            elem.classList.remove('mute');

            myStream.getAudioTracks()[0].enabled = true;
        }

        broadcastNewTracks(myStream, 'audio');
    });

    // When user clicks the 'Share screen button
    document.getElementById('screenShare').addEventListener('click', (e) => {
        e.preventDefault();

        if (screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended') {
            stopSharingScreen();
        } else {
            shareScreen();
        }
    });

    document.getElementById('leave').addEventListener('click', (e) => {
        e.preventDefault();

        leaveMeeting();
        window.location.href = "/"
    });

    //  When user clicks the 'Raise Your Hand' button
    document.getElementById('toggle-hand').addEventListener('click', (e) => {
        e.preventDefault();

        let elem = document.getElementById('toggle-hand');

        if (elem.getAttribute('title') === 'Raise Your Hand') {
            elem.setAttribute('title', 'Lower Your Hand');
            elem.children[0].classList.add('text-primary');

            raisedHand();

            setTimeout(() => {
                elem.setAttribute('title', 'Raise Your Hand');
                elem.children[0].classList.remove('text-primary');
            }, 5000);
        } else {
            elem.setAttribute('title', 'Raise Your Hand');
            elem.children[0].classList.remove('text-primary');
        }
    });

    //copy meeting link
    document.getElementById('meetingLink').addEventListener('click', (e) => {
        e.preventDefault();

        let text = window.location.href;
        if (!navigator.clipboard) {
            let textArea = document.createElement("textarea")
            textArea.value = text
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            try {
                document.execCommand('copy')
                h.alert("success", "Meeting URL copied to clipboard!", 'top-start');
            } catch (err) {
                h.alert("error", "Failed to copy", 'top-start');
            }
            document.body.removeChild(textArea)
            return
        }
        navigator.clipboard.writeText(text).then(function () {
            h.alert("success", "Meeting URL copied to clipboard!", 'top-start');
        }, () => {
            h.alert("error", "Failed to copy", 'top-start');
        })
    });

    // document.getElementById('check-btn').addEventListener('click', (e) => {
    //     e.preventDefault();
    //     document.getElementById('meeting-checking-page').setAttribute('hidden', 'true');
    //     document.getElementById('meeting-page').attributes.removeNamedItem('hidden');
    // });
});