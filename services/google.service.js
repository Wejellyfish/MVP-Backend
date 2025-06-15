// services/google.service.js
const axios = require("axios");

const verifyGoogleToken = async (idToken) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;

    const response = await axios.get(url);

    if (response.status !== 200 || !response.data.sub) {
        throw new Error("Invalid ID token");
    }

    return response.data;
};

module.exports = { verifyGoogleToken };
