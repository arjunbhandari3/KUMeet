const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.EMAIL_KEY);

module.exports = {
    generateRandomString() {
        return ("0000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-4) + "-" + ("000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-3) + "-" + ("0000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-4);
    },

    generateRandomPassword() {
        return Math.random().toString(36).slice(-8);
    },
    // sendVerificationEmail(user, token) {
    //     const verifyUrl = `http://localhost:3000/account/verify-email?token=${token}`;
    //     sgMail.send({
    //         from: process.env.EMAIL_FROM,
    //         to: user.email,
    //         subject: 'Welcome to KUMeet! Verify Your Email',
    //         html: `<h4>Verify Email</h4>
    //                <p>Thanks for registering!</p>
    //                <p>Please click the below link to verify your email address:</p>
    //               <p><a href="${verifyUrl}">${verifyUrl}</a></p>`
    //     });
    // }
};