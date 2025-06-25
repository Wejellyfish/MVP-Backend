const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, addFavoritePlace, getFavoritePlaces, removeFavoritePlace } = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');

router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, upload.single('profileImage'), updateUserProfile);
router.post('/favorites', authenticateToken, addFavoritePlace);
router.get('/favorites', authenticateToken, getFavoritePlaces);
router.delete('/favorites', authenticateToken, removeFavoritePlace);

module.exports = router;