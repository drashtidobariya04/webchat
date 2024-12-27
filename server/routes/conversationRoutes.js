const express = require("express");
const router = express.Router();
const {
  createConversation,
  getConversationsByUserId,
} = require("../controller/conversationController"); // Adjust the path

// Create a new conversation
router.post("/conversation", createConversation);

// Get conversations for a specific user
router.get("/conversations/:userId", getConversationsByUserId);

module.exports = router;
