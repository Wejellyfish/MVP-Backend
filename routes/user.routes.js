const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');

router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, upload.single('profileImage'), updateUserProfile);

module.exports = router;