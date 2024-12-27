const Messages = require("../models/Messages"); // Adjust the path based on your project structure
const Conversations = require("../models/Conversations"); // Adjust the path
const Users = require("../models/Users"); // Adjust the path

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;

    if (!senderId || !message) {
      return res.status(400).send("Please fill all required fields");
    }

    if (conversationId === "new" && receiverId) {
      // Create a new conversation and save the message
      const newConversation = new Conversations({
        members: [senderId, receiverId],
      });
      await newConversation.save();

      const newMessage = new Messages({
        conversationId: newConversation._id,
        senderId,
        message,
      });
      await newMessage.save();

      return res.status(200).send("Message sent successfully");
    } else if (!conversationId && !receiverId) {
      return res.status(400).send("Please fill all required fields");
    }

    // Save message to an existing conversation
    const newMessage = new Messages({
      conversationId,
      senderId,
      message,
    });
    await newMessage.save();

    return res.status(200).send("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).send("An error occurred while sending the message");
  }
};

// Get messages by conversation ID
const getMessagesByConversationId = async (req, res) => {
  try {
    const checkMessages = async (conversationId) => {
      const messages = await Messages.find({ conversationId });
      const messageUserData = await Promise.all(
        messages.map(async (message) => {
          const user = await Users.findById(message.senderId);
          return {
            user: {
              id: user._id,
              email: user.email,
              fullName: user.fullName,
            },
            message: message.message,
          };
        })
      );
      return res.status(200).json(messageUserData);
    };

    const conversationId = req.params.conversationId;

    if (conversationId === "new") {
      // Handle new conversation
      const checkConversation = await Conversations.find({
        members: { $all: [req.query.senderId, req.query.receiverId] },
      });

      if (checkConversation.length > 0) {
        return checkMessages(checkConversation[0]._id);
      } else {
        return res.status(200).json([]);
      }
    } else {
      // Handle existing conversation
      return checkMessages(conversationId);
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).send("An error occurred while fetching messages");
  }
};

module.exports = {
  sendMessage,
  getMessagesByConversationId,
};
