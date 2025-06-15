const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { verifyGoogleToken } = require("../services/google.service");

const googleLogin = async (req, res) => {

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: "ID token is required" });
    }

    try {

        const payload = await verifyGoogleToken(idToken);
        const { sub: provider_id, email, fullName, picture: avatar } = payload;

        let user = await db("users").where({ provider_id, provider: "google" }).first();

        if (!user) {
            const inserted = await db("users")
                .insert({
                    provider: "google",
                    provider_id,
                    fullName,
                    email,
                    avatar,
                })
                .returning("*");

            user = inserted[0];
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, user });

    } catch (err) {
        console.error("Google login error:", err.message);
        res.status(401).json({ message: "Invalid Google token" });
    }

}


module.exports = { googleLogin };