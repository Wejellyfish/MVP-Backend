// //
const db = require("../config/db");

const getUsers = async (req, res) => {
    try {
        const users = await db('users').select("*").orderBy("created_at", "desc");
        return res.status(201).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const createUser = async (req, res) => {
    const { fullName, email, phoneNumber, city, area, bio, profileImage, isVerified } = req.body;

    if (!fullName || !email || !phoneNumber || !city || !area) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const existingUser = await db("users").where({ email }).first();

        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const [newUser] = await db("users")
            .insert({
                fullName,
                email,
                phoneNumber,
                city,
                area,
                bio: bio || null,
                profileImage: profileImage || null,
                isVerified: isVerified || false,
            })
            .returning("*");

        res.status(201).json({ user: newUser });
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { fullName, email, phoneNumber, city, area, bio, profileImage, isVerified } = req.body;

    if (!id || !fullName || !email || !phoneNumber) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const user = await db("users").where({ id }).first();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = await db("users")
            .where({ id })
            .update({
                fullName,
                email,
                phoneNumber,
                city,
                area,
                bio,
                profileImage: profileImage || user.profileImage,
                isVerified: isVerified !== undefined ? isVerified : user.isVerified,
            })
            .returning("*");

        res.status(200).json({ user: updatedUser[0] });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { getUsers, createUser, updateUser };
