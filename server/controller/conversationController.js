const Conversations = require("../models/Conversations"); // Adjust the path based on your project structure
const Users = require("../models/Users"); // Adjust the path based on your project structure

// Create a new conversation
const createConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).send("Sender ID and Receiver ID are required");
    }

    const newConversation = new Conversations({
      members: [senderId, receiverId],
    });

    await newConversation.save();
    return res.status(200).send("Conversation created successfully");
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res
      .status(500)
      .send("An error occurred while creating the conversation");
  }
};

// Get conversations for a specific user
const getConversationsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).send("User ID is required");
    }

    const conversations = await Conversations.find({
      members: { $in: [userId] },
    });

    const conversationUserData = await Promise.all(
      conversations.map(async (conversation) => {
        const receiverId = conversation.members.find(
          (member) => member !== userId
        );
        const user = await Users.findById(receiverId);

        if (user) {
          return {
            user: {
              receiverId: user._id,
              email: user.email,
              fullName: user.fullName,
            },
            conversationId: conversation._id,
          };
        }

        return null;
      })
    );

    const filteredData = conversationUserData.filter((data) => data !== null);

    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res
      .status(500)
      .send("An error occurred while fetching conversations");
  }
};

module.exports = {
  createConversation,
  getConversationsByUserId,
};
