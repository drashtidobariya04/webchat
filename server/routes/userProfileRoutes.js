const express = require("express");
const {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
} = require("../controller/userProfileController");

const router = express.Router();

// Create a new profile
router.post("/profiles", createProfile);

// Get a profile by user ID
router.get("/profiles/:userId", getProfile);

// Update a profile
router.put("/profiles/:userId", updateProfile);

// Delete a profile
router.delete("/profiles/:userId", deleteProfile);

module.exports = router;
