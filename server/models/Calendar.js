const mongoose = require("mongoose");

const noticeSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true, // User ID is required to associate the notice with a user
  },
  title: {
    type: String,
    required: true, // Title of the notice is mandatory
  },
  description: {
    type: String,
    default: "", // Optional description for the notice
  },
  date: {
    type: Date,
    required: true, // Date for the reminder is mandatory
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the timestamp when the notice is created
  },
});

const Notice = mongoose.model("Notice", noticeSchema);

module.exports = Notice;
