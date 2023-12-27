const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor() {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    async sendVerificationEmail(email, verificationCode) {
        const msg = {
            to: email,
            from: process.env.EMAIL_SENDER, // Your verified sender
            subject: 'Verify Your Email',
            text: `Your verification code is: ${verificationCode}`,
            // You can also use HTML content here
        };

        try {
            await sgMail.send(msg);
            console.log('Email sent');
        } catch (error) {
            console.error('Error sending verification email:', error);
            throw new Error('Unable to send verification email');
        }
    }
}

module.exports = EmailService;
