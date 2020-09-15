const stream = (socket) => {
    socket.on('join', (data) => {
        //join a room
        socket.join(data.room);
        socket.join(data.socketId);

        //Inform other members in the room of new user's arrival
        if (socket.adapter.rooms[data.room].length > 1) {
            socket.to(data.room).emit('new user', {
                socketId: data.socketId
            });
        }
    });

    socket.on('newUserStart', (data) => {
        socket.to(data.to).emit('newUserStart', {
            sender: data.sender
        });
    });

    socket.on('sdp', (data) => {
        socket.to(data.to).emit('sdp', {
            description: data.description,
            sender: data.sender
        });
    });

    socket.on('ice candidates', (data) => {
        socket.to(data.to).emit('ice candidates', {
            candidate: data.candidate,
            sender: data.sender
        });
    });

    socket.on('chat', (data) => {
        socket.to(data.room).emit('chat', {
            sender: data.sender,
            msg: data.msg
        });
    });

    socket.on('raiseHand', (data) => {
        socket.to(data.room).emit('raiseHand', {
            raiser: data.raiser
        });
    });

    socket.on('file-send-start', function (data) {
        socket.to(data.room).emit('file-receive-start', data.file);
    });

    socket.on('file-send-complete', function (data) {
        socket.to(data.room).emit('file-receive-complete', data.file);
    });

    socket.on('disconnect', (data) => {
        //leave a room
        socket.leave(data.room);
        socket.leave(data.socketId);

        socket.to(data.room).emit('user leave', {
            socketId: data.socketId,
            sender: data.sender
        });
    });
};

module.exports = stream;