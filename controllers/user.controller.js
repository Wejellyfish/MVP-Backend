// controllers/user.controller.js
const db = require("../config/db");
const path = require("path");
const fs = require("fs");


// --- Helper function to delete old image ---
const deleteOldProfileImage = async (oldImagePath) => {
    if (oldImagePath) {
        // Construct the full path
        const fullPath = path.join(__dirname, '..', oldImagePath);
        try {
            await fs.access(fullPath); // Check if file exists
            await fs.unlink(fullPath); // Delete the file
            console.log(`Deleted old profile image: ${fullPath}`);
        } catch (fsError) {
            // Ignore 'file not found' errors, log others
            if (fsError.code !== 'ENOENT') {
                console.warn(`Could not delete old profile image ${fullPath}:`, fsError);
            }
        }
    }
};


// GET User Profile
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await db('users')
            .select('id', 'fullName', 'email', 'phoneNumber', 'city', 'area', 'bio', 'profileImage', 'isVerified', 'created_at', 'updated_at')
            .where({ id: userId })
            .first();

        if (!user) {
            return res.status(404).json({ message: "User profile not found." });
        }

        res.status(200).json({ user });

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};


// PUT/POST User Profile
const updateUserProfile = async (req, res) => {
    try {
        // Multer has already processed the file and body by this point
        const userId = req.user.id; // From authenticateToken middleware
        const { fullName, email, city, area, bio } = req.body;
        const profileImageFile = req.file; // This is provided by Multer if a file was uploaded
        const clearProfileImage = req.body.profileImage === 'null' || req.body.profileImage === ''; // Check for explicit clear signal

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (city) updateData.city = city;
        if (area) updateData.area = area;
        if (bio) updateData.bio = bio;

        let oldProfileImagePath = null; // To store the path of the current user's image, if any

        // Fetch old user data to get current profileImage path
        const oldUser = await db('users').where({ id: userId }).first();
        if (oldUser) {
            oldProfileImagePath = oldUser.profileImage;
        }

        // Handle profile image update
        if (profileImageFile) {
            // A new file was uploaded
            updateData.profileImage = `/uploads/profileImages/${profileImageFile.filename}`;
            // Delete the old image if a new one is uploaded
            await deleteOldProfileImage(oldProfileImagePath);
        } else if (clearProfileImage) {
            // Client explicitly requested to clear the image
            updateData.profileImage = null;
            // Delete the old image if it existed
            await deleteOldProfileImage(oldProfileImagePath);
        }


        // Validate email if provided
        if (updateData.email) {
            const existingUserWithEmail = await db('users')
                .where({ email: updateData.email })
                .whereNot({ id: userId }) // Exclude the current user
                .first();

            if (existingUserWithEmail) {
                // If a file was uploaded, delete it before sending error response
                if (profileImageFile) {
                    await fs.unlink(profileImageFile.path).catch(console.error);
                }
                return res.status(409).json({ message: "Email already in use by another account." });
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No fields provided for update." });
        }

        const updatedCount = await db('users')
            .where({ id: userId })
            .update(updateData);

        if (updatedCount === 0) {
            return res.status(404).json({ message: "User not found or nothing to update." });
        }

        const updatedUser = await db('users')
            .select('id', 'fullName', 'email', 'phoneNumber', 'city', 'area', 'bio', 'profileImage', 'isVerified', 'created_at', 'updated_at')
            .where({ id: userId })
            .first();

        res.status(200).json({
            message: "Profile updated successfully!",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error updating user profile:", error);
        // If an error occurs after Multer has processed the file, clean it up
        if (req.file) { // Use req.file here, as Multer stores file info there
            await fs.unlink(req.file.path).catch(console.error);
        }
        // Handle Multer-specific errors if they weren't caught by the middleware chain (less likely now)
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File size too large. Max 5MB allowed." });
        }
        if (error.message === 'Only image files are allowed!') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Internal server error." });
    }
};



module.exports = { getUserProfile, updateUserProfile };
