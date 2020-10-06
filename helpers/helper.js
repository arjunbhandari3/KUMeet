const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.EMAIL_KEY);

module.exports = {
    generateRandomString() {
        return ("0000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-4) + "-" + ("000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-3) + "-" + ("0000" + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-4);
    },

    generateRandomPassword() {
        return Math.random().toString(36).slice(-8);
    },

    async sendVerificationEmail(user, token) {
        let verifyUrl = `https://kumeet.herokuapp.com/account/verify-email?token=${token}`
        // const verifyUrl = `http://localhost:3000/account/verify-email?token=${token}`;
        const msg = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Verify Your Email',
            html: `<h2>Welcome to KUMeet! Verify Your Email</h2>
                <h4>Hi ${user.full_name},</h4>
               <p>Please click the below link to verify your email address:</p>
              <p><a href="${verifyUrl}">${verifyUrl}</a></p>
              <h4>Thanks for registering!</h4>
              <p>Regards,</p>
              <h4>KUMeet</h4>`
        }
        await sgMail.send(msg);
        console.log('Mail sent successfully')
    }
};