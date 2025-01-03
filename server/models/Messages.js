const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
  },

  message: {
    type: String,
  },
  image: {
    type: String,
    default: null, // Default to null if no image is sent
  },

  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the timestamp when the message is created
  },
});

const messages = mongoose.model("message", messageSchema);

module.exports = messages;
