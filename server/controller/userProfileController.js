const UserProfile = require("../models/UserProfile");

// Create a new profile
const createProfile = async (req, res) => {
  try {
    const { userId, bio, location, profilePicture, socialLinks } = req.body;

    // Check if a profile already exists for the user
    const existingProfile = await UserProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).send("Profile already exists for this user");
    }

    const profile = new UserProfile({
      userId,
      bio,
      location,
      profilePicture,
      socialLinks,
    });

    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).send("An error occurred while creating the profile");
  }
};

// Get a profile by user ID
const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).send("An error occurred while fetching the profile");
  }
};

// Update a profile
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true } // Return the updated document
    );

    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("An error occurred while updating the profile");
  }
};

// Delete a profile
const deleteProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOneAndDelete({ userId });

    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    res.status(200).send("Profile deleted successfully");
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).send("An error occurred while deleting the profile");
  }
};

module.exports = {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
};
