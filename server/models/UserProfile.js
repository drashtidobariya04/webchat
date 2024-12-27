const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true, // Ensure one profile per user
    },
    userName: {
      type: String,
      required: true, // Assuming userName is mandatory
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"], // Optional, depending on your needs
      default: "Prefer not to say", // Default value
    },
    bio: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String, // URL of the profile picture
      default: "",
    },
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
  },
  { timestamps: true }
); // Automatically adds createdAt and updatedAt

const UserProfile = mongoose.model("UserProfile", userProfileSchema);
module.exports = UserProfile;
