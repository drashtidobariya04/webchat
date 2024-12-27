const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessagesByConversationId,
} = require("../controller/messageController"); // Adjust the path

// Send a message
router.post("/message", sendMessage);

// Get messages by conversation ID
router.get("/message/:conversationId", getMessagesByConversationId);

module.exports = router;
