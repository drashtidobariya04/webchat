const multer = require("multer");
const path = require("path");

// Set storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files in the "uploads" directory
  },
  filename: (req, file, cb) => {
    // Save files with the original name, and add timestamp to avoid name conflicts
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Set file filter for allowed file types (optional)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"]; // Allowed MIME types
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create multer instance with storage options and file filter
const upload = multer({ storage, fileFilter });

module.exports = upload;
