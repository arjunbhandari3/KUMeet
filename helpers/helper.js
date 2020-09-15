module.exports = {
    generateRandomString() {
        return ("0000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-4) + "-" + ("000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-3) + "-" + ("0000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-4);
    },

    generateRandomPassword() {
        return Math.random().toString(36).slice(-8);
    },
};