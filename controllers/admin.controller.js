// //
const db = require("../config/db");
const { generateAdminToken } = require("../utils/tokenUtils");

const adminLogin = async (req, res) => {
    const adminCredential = { username: 'admin', password: 'admin123' }
    const { username, password } = req.body;

    if (username == adminCredential.username && password == adminCredential.password) {
        const token = generateAdminToken(username);
        return res.status(201).json({ token, message: "Admin Login Successful !" })
    } else {
        return res.status(400).json({ message: "Invalid username or password" });
    }
}


const getUsers = async (req, res) => {
    try {
        const users = await db('users').select("*").orderBy("created_at", "desc");
        return res.status(201).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db('users').where({ id }).first();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


const createUser = async (req, res) => {
    const { fullName, email, phoneNumber, city, area, bio, profileImage, isVerified } = req.body.usersData;

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
    const { fullName, email, phoneNumber, city, area, bio, profileImage, isVerified } = req.body.usersData;

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


const deleteUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await db('users').where({ id }).first();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await db('users').where({ id }).del();

        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const deleteMultipleUsers = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Invalid or missing user IDs" });
        }

        await db("users").whereIn("id", ids).del();

        return res.status(200).json({ message: "Users deleted successfully" });
    } catch (error) {
        console.error("Error deleting multiple users:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { adminLogin, getUsers, getUserById, createUser, updateUser, deleteUserById, deleteMultipleUsers };
