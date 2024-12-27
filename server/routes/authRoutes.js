const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controller/authController"); // Adjust the path based on your project structure

// Registration route
router.post("/register", registerUser);

// Login route
router.post("/login", loginUser);

module.exports = router;
