const multer = require('multer');
const path = require('path');
const fs = require('fs/promises'); // For ensuring directory exists

// --- Multer Configuration for Profile Image Upload ---
// You'll need a directory to store uploaded images
// This path is relative to the project root
const uploadDir = path.join(__dirname, '..', 'uploads', 'profileImages');

// Ensure the upload directory exists
fs.mkdir(uploadDir, { recursive: true })
    .catch(console.error); // Log error if directory creation fails (e.g., permissions)

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save to the defined upload directory
    },
    filename: (req, file, cb) => {
        // Use a unique filename to prevent clashes
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filter to allow only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Only image files are allowed!'), false); // Reject the file
    }
};

// Configure multer with storage, file filter, and limits
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit (adjust as needed)
    }
});

// Export the configured upload middleware
// You can export it as a single field uploader or as an object if you have multiple types
module.exports = upload;