const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const MeetingSchema = new mongoose.Schema({
    room_name: {
        type: String,
    },
    room_code: {
        type: String,
        index: {
            unique: true,
            dropDups: true,
        },
    },
    password: {
        type: String,
    },
    meeting_date:{
        type: Date
    },
    start_time:{
        type: String
    },
    end_time:{
        type: String
    },
    owner: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

MeetingSchema.methods.encryptPassword = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

MeetingSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};
const MeetingModel = mongoose.model("Meeting", MeetingSchema);

module.exports = MeetingModel;