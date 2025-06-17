const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || "DevelopmentSecret";
const accessSecret = process.env.ACCESS_SECRET;
const refreshSecret = process.env.REFRESH_SECRET;

const generateAdminToken = (username) => {
    return jwt.sign({ username }, secret, { expiresIn: '7d' });
};

const generateToken = (userId, phoneNumber) => {
    return jwt.sign({ userId, phoneNumber }, secret, { expiresIn: '7d' });
};

const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, accessSecret, { expiresIn: '1m' });
};

const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, accessSecret);
};

const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, refreshSecret);
    } catch {
        return null;
    }
};


module.exports = { generateAdminToken, generateToken, generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };