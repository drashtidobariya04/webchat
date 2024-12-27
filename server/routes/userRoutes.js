const express = require("express");
const router = express.Router();
const { getUsersExcludingCurrent } = require("../controller/userController"); // Adjust the path

// Get all users except the provided user ID
router.get("/users/:userId", getUsersExcludingCurrent);

module.exports = router;
