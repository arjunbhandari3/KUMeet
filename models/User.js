const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
    full_name: {
        type: String,
    },
    email: {
        type: String,
        trim: true,
        index: {
            unique: true,
            dropDups: true,
        },
    },
    password: {
        type: String,
    },
    token: {
        type: String,
    },
    image: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

UserSchema.methods.encryptPassword = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};
const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;