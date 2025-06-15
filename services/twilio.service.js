const twilio = require('twilio');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);


const sendOTP = async (phoneNumber) => {
    try {
        const verification = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SID)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });

        return verification;
    } catch (error) {
        console.error("Twilio send error:", error);
        throw new Error("Failed to send OTP", error);
    }

}


const verifyOTP = async (phoneNumber, code) => {

    try {
        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SID)
            .verificationChecks
            .create({ to: phoneNumber, code });

        return verificationCheck;

    } catch (error) {
        console.error("Twilio verification error:", error);
        throw new Error("Failed to verify OTP", error);

    }
};


module.exports = { sendOTP, verifyOTP };