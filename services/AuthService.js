const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();
const EmailService = require('./EmailService');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const AppleAuth = require('apple-auth');
const appleConfig = require('../config/apple.config.json'); // You need to set up Apple Config


class AuthService {
  async register(email, password) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Email format validation
    const emailRegex = new RegExp(process.env.EMAIL_REGEX_PATTERN);
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Password strength validation
    if (password.length < parseInt(process.env.MIN_PASSWORD_LENGTH)) {
      throw new Error(
        "Password must be at least " +
          process.env.MIN_PASSWORD_LENGTH +
          " characters long"
      );
    }

    if (
      process.env.PASSWORD_MUST_HAVE_NUMBERS === "true" &&
      !/\d/.test(password)
    ) {
      throw new Error("Password must contain at least one number");
    }
    if (
      process.env.PASSWORD_MUST_HAVE_UPPERCASE === "true" &&
      !/[A-Z]/.test(password)
    ) {
      throw new Error("Password must contain at least one uppercase letter");
    }
    if (
      process.env.PASSWORD_MUST_HAVE_LOWERCASE === "true" &&
      !/[a-z]/.test(password)
    ) {
      throw new Error("Password must contain at least one lowercase letter");
    }
    if (
      process.env.PASSWORD_MUST_HAVE_SPECIAL_CHAR === "true" &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      throw new Error("Password must contain at least one special character");
    }

    // Check for existing user with the same email
    const existingUser = await prisma.appUser.findUnique({ where: { email } });
    if (existingUser) {
      const isPasswordCorrect = await bcrypt.compare(
        password,
        existingUser.password
      );
      if (!isPasswordCorrect) {
        throw new Error("Email already in use");
      } else {
        // Email exists and password is correct - proceed as if it's a login
        return this.login(email, password);
      }
    }

    // Proceed with new user registration if email does not exist
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.appUser.create({
        data: {
          email,
          password: hashedPassword,
          failedLoginAttempts: 0,
        },
      });

      if (process.env.EMAIL_VERIFICATION === "true") {
        await this.sendVerificationCode(email);
      }

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error("Registration Error:", error);
      throw new Error("Unable to register user at this time");
    }
  }

  async login(email, password) {
    if (!email || !password) {
        throw new Error("Email and password are required");
      }
    
      // Fetch the user early
      const user = await prisma.appUser.findUnique({ where: { email } });
    
      if (!user) {
        throw new Error("Invalid email or password");
      }
    
      // Now check for email verification
      if (process.env.EMAIL_VERIFICATION === "true" && user.verificationCode) {
        throw new Error("Email not verified");
      }
    

    if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
      throw new Error("Account is temporarily locked. Please try again later.");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await this.handleFailedLoginAttempt(user);
      throw new Error("Invalid email or password");
    }

    if (user.failedLoginAttempts > 0) {
      await prisma.appUser.update({
        where: { email: email },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return token;
  }

  async handleFailedLoginAttempt(user) {
    let failedAttempts = user.failedLoginAttempts + 1;
    let lockoutUntil = null;

    if (failedAttempts >= process.env.FAILED_LOGIN_ATTEMPTS) {
      lockoutUntil = new Date();
      lockoutUntil.setMinutes(
        lockoutUntil.getMinutes() + process.env.LOCKOUT_TIME
      );
      failedAttempts = 0;
    }

    await prisma.appUser.update({
      where: { email: user.email },
      data: { failedLoginAttempts: failedAttempts, lockoutUntil: lockoutUntil },
    });
  }

  async sendVerificationCode(email) {
    const emailService = new EmailService();
    const verificationCode = crypto.randomBytes(3).toString('hex');
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + process.env.EMAIL_EXPIRES_IN); // Code expires in 10 minutes

    await prisma.appUser.update({
        where: { email },
        data: { verificationCode, verificationCodeExpires: expirationTime }
    });

    await emailService.sendVerificationEmail(email, verificationCode);
}

async passwordlessLoginOrRegister(email) {
    if (!email) {
        throw new Error('Email is required');
    }

    let user = await prisma.appUser.findUnique({ where: { email } });

    if (!user) {
        user = await prisma.appUser.create({
            data: {
                email,
            },
        });


        await this.sendVerificationCode(email);
        return { message: "New user registered, verification email sent." };
    }

    return { message: "User logged in." };
}




async verifyCodeAndGenerateToken(email, code) {
    const user = await prisma.appUser.findUnique({ where: { email } });

    if (!user || user.verificationCode !== code || new Date() > new Date(user.verificationCodeExpires)) {
        throw new Error('Invalid or expired code');
    }

    // Reset the verification code and expiration in a single update call
    await prisma.appUser.update({
        where: { email },
        data: {
            verificationCode: "", // Set to empty string instead of null
            verificationCodeExpires: null
        },
    });

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return token;
}


async googleLogin(token) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    return this.processOAuthUser(payload.email, payload.name, 'google');
}

async appleLogin(token) {
    const appleAuth = new AppleAuth(appleConfig, appleConfig.key_id);
    const payload = await appleAuth.accessToken(token);
    
    return this.processOAuthUser(payload.email, payload.name, 'apple');
}

async processOAuthUser(email, name, provider) {
    let user = await prisma.appUser.findUnique({ where: { email } });

    if (!user) {
        user = await prisma.appUser.create({
            data: {
                email,
                name, // Assuming your user model has a name field
                provider, // You might want to track the provider
                // Other necessary fields with default or null values
            }
        });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return token;
}


  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
}

module.exports = AuthService;
