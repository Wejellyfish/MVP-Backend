const jwt = require('jsonwebtoken');
const db = require('../config/db')
const { sendOTP, verifyOTP } = require('../services/twilio.service');
const { generateToken } = require('../utils/tokenUtils');


const sendOtpHandler = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
    }

    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number format" });
    }

    try {
        let user = await db('users').where({ phoneNumber }).first();

        // If user exists and is already verified, return early.
        // if (user && user.isVerified) {
        //     return res.status(200).json({ message: "User already verified", isVerified: true });
        // }

        // Send OTP if user is new or existing unverified user
        const response = await sendOTP(phoneNumber);
        if (response.status !== 'pending') {
            return res.status(500).json({ message: "Failed to send OTP" });
        }

        res.status(200).json({
            message: "OTP sent successfully",
            status: response.status,
            isVerified: user ? user.isVerified : false,
        });

    } catch (error) {
        console.error("Twilio send error:", error);
        res.status(500).json({ message: "Failed to send OTP" });
    }
};


const verifyOtpHandler = async (req, res) => {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
    }

    try {
        // Special test code
        if (code === "000000") {
            await db("users").where({ phoneNumber }).update({ isVerified: true });
            let user = await db('users').where({ phoneNumber }).first(); // Fetch after update
            if (!user) { // If user still doesn't exist after a dummy update attempt (e.g., brand new number)
                const [newUser] = await db("users").insert({ phoneNumber, isVerified: true }).returning("*");
                user = newUser;
            }
            const token = generateToken(user.id, user.phoneNumber);
            return res.status(200).json({ message: "OTP verified successfully (test mode)", token, user: { phoneNumber: user.phoneNumber, isVerified: true } });
        }

        // Actual verification with Twilio
        const verificationCheck = await verifyOTP(phoneNumber, code);
        if (verificationCheck.status !== 'approved') {
            return res.status(401).json({ message: "Invalid or expired OTP" });
        }

        let user = await db('users').where({ phoneNumber }).first();

        if (!user) {
            const [newUser] = await db("users").insert({ phoneNumber, isVerified: true }).returning("*");
            user = newUser;
        } else if (!user.isVerified) {
            // User exists but was unverified; update their status.
            await db("users").where({ phoneNumber }).update({ isVerified: true });
            user.isVerified = true;
        }

        // Generate JWT or session token
        const token = generateToken(user.id, user.phoneNumber);

        return res.status(200).json({
            message: "OTP verified successfully",
            token,
            user: { phoneNumber: user.phoneNumber, isVerified: user.isVerified },
        });

    } catch (error) {
        console.error("OTP verification failed:", error);
        if (error.code === 60200) {
            return res.status(401).json({ message: "Invalid or expired OTP" });
        }
        return res.status(500).json({ message: "Internal server error" });
    }
};



const resendOtpHandler = async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
    }

    try {
        const response = await sendOTP(phoneNumber);

        res.status(200).json({
            message: "OTP resent successfully",
            status: response.status,
        });
    } catch (error) {
        console.error("Twilio resend error:", error);
        res.status(500).json({ message: "Failed to resend OTP" });
    }
};


module.exports = { sendOtpHandler, verifyOtpHandler, resendOtpHandler };