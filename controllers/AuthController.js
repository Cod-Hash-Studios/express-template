const AuthService = require('../services/AuthService');
const { HttpGet, HttpPost, HttpPut, HttpDelete, HttpPatch } = require('../config/decorateur');

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    @HttpPost('/auth/register')
    async register(req, res) {
        const { email, password } = req.body;

        // Basic validation
        if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).send(email);
        }
    
        try {
            await this.authService.register(email, password);
            const token = await this.authService.login(email, password);
            res.json({ token });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPost('/auth/login')
    async login(req, res) {
        const { email, password } = req.body;
        try {
            const token = await this.authService.login(email, password);
            res.json({ token });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPost('/auth/passwordless')
    async passwordlessLoginOrRegister(req, res) {
        try {
            await this.authService.passwordlessLoginOrRegister(req.body.email);
            res.status(200).send('Ok');
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPost('/auth/verify')
    async verifyCode(req, res) {
        try {
            const token = await this.authService.verifyCodeAndGenerateToken(req.body.email, req.body.code);
            res.json({ token });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPost('/auth/google')
    async googleLogin(req, res) {
        try {
            const token = await this.authService.googleLogin(req.body.token);
            res.json({ token });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    @HttpPost('/auth/apple')
    async appleLogin(req, res) {
        try {
            const token = await this.authService.appleLogin(req.body.token);
            res.json({ token });
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
}

module.exports = AuthController;



// Google, Apple, thirdweb, classic credentials, passwordless
// typescript