const Users = require("../models/Users"); // Adjust the path based on your project structure

// Get all users except the provided user ID
const getUsersExcludingCurrent = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).send("User ID is required");
    }

    const users = await Users.find({ _id: { $ne: userId } });

    const usersData = await Promise.all(
      users.map(async (user) => {
        return {
          user: {
            email: user.email,
            fullName: user.fullName,
            receiverId: user._id,
          },
        };
      })
    );

    return res.status(200).json(usersData);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).send("An error occurred while fetching users");
  }
};

module.exports = {
  getUsersExcludingCurrent,
};
