
const express = require('express');
const router = express.Router();
const { sendOtpHandler, verifyOtpHandler, resendOtpHandler } = require('../controllers/mobile.controller');

router.post("/send-otp", sendOtpHandler);
router.post("/verify-otp", verifyOtpHandler);
router.post("/resend-otp", resendOtpHandler);

module.exports = router;