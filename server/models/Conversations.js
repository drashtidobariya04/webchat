const mongoose = require("mongoose");

const conversationsSchema = mongoose.Schema({
  members: {
    type: Array, // Array of user IDs involved in the conversation
    required: true,
  },
});

const Conversations = mongoose.model("Conversations", conversationsSchema);

module.exports = Conversations;
