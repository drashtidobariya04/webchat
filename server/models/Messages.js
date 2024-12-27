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
});

const messages = mongoose.model("message", messageSchema);

module.exports = messages;
