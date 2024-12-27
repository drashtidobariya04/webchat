const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const io = require("socket.io")(8080, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const { sendOTPEmail, generateOTP } = require("./services/sendMail");

// Connect DB
require("./db/connection");
// Import Files
const Users = require("./models/Users");
const Conversations = require("./models/Conversations");
const Messages = require("./models/Messages");
const UserProfile = require("./models/UserProfile");
const sendLoginEmail = require("./services/sendMail");

// app Use
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;

// Socket.io
let users = [];
io.on("connection", (socket) => {
  console.log("User connected", socket.id);
  socket.on("addUser", (userId) => {
    const isUserExist = users.find((user) => user.userId === userId);
    if (!isUserExist) {
      const user = { userId, socketId: socket.id };
      users.push(user);
      io.emit("getUsers", users);
    }
  });

  socket.on(
    "sendMessage",
    async ({ senderId, receiverId, message, conversationId }) => {
      const receiver = users.find((user) => user.userId === receiverId);
      const sender = users.find((user) => user.userId === senderId);
      const user = await Users.findById(senderId);
      console.log("sender :>> ", sender, receiver);
      if (receiver) {
        io.to(receiver.socketId)
          .to(sender.socketId)
          .emit("getMessage", {
            senderId,
            message,
            conversationId,
            receiverId,
            user: { id: user._id, fullName: user.fullName, email: user.email },
          });

        // Notify receiver about the new message
        io.to(receiver.socketId).emit("notification", {
          senderId,
          message,
          conversationId,
          receiverId,
          user: { id: user._id, fullName: user.fullName, email: user.email },
        });
      } else {
        io.to(sender.socketId).emit("getMessage", {
          senderId,
          message,
          conversationId,
          receiverId,
          user: { id: user._id, fullName: user.fullName, email: user.email },
        });
      }
    }
  );

  socket.on("disconnect", () => {
    users = users.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", users);
  });
  // io.emit('getUsers', socket.userId);
});

// Routes
app.get("/", (req, res) => {
  res.send("Welcome");
});

app.post("/api/register", async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).send("Please fill all required fields");
    } else {
      const isAlreadyExist = await Users.findOne({ email });
      if (isAlreadyExist) {
        res.status(400).send("User already exists");
      } else {
        const newUser = new Users({ fullName, email });
        bcryptjs.hash(password, 10, (err, hashedPassword) => {
          newUser.set("password", hashedPassword);
          newUser.save();
          next();
        });
        return res.status(200).send("User registered successfully");
      }
    }
  } catch (error) {
    console.log(error, "Error");
  }
});

// // Login endpoint
// app.post("/api/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check for missing fields
//     if (!email || !password) {
//       return res.status(400).send("Please fill all required fields");
//     }

//     // Find user by email
//     const user = await Users.findOne({ email });
//     if (!user) {
//       return res.status(400).send("User email or password is incorrect");
//     }

//     // Validate password
//     const validateUser = await bcryptjs.compare(password, user.password);
//     if (!validateUser) {
//       return res.status(400).send("User email or password is incorrect");
//     }

//     // Create JWT payload and sign token
//     const payload = {
//       userId: user._id,
//       email: user.email,
//     };
//     const JWT_SECRET_KEY =
//       process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";

//     jwt.sign(
//       payload,
//       JWT_SECRET_KEY,
//       { expiresIn: 84600 }, // Token expiration time
//       async (err, token) => {
//         if (err) {
//           console.error("Error signing token:", err);
//           return res.status(500).send("Error creating token");
//         }

//         // Update user with the new token
//         await Users.updateOne({ _id: user._id }, { $set: { token } });

//         // Send login email
//         await sendLoginEmail(user.email);
//         console.log("send Email", user.email);

//         // Respond with success
//         return res.status(200).json({
//           user: {
//             id: user._id,
//             email: user.email,
//             fullName: user.fullName,
//           },
//           token: token,
//         });
//       }
//     );
//   } catch (error) {
//     console.error("Error during login:", error);
//     return res.status(500).send("Internal server error");
//   }
// });

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for missing fields
    if (!email || !password) {
      return res.status(400).send("Please fill all required fields");
    }

    // Find user by email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).send("User email or password is incorrect");
    }

    // Validate password
    const validateUser = await bcryptjs.compare(password, user.password);
    if (!validateUser) {
      return res.status(400).send("User email or password is incorrect");
    }

    // Generate OTP and store it temporarily in the user document
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp);

    // Respond with a success message
    return res.status(200).send("OTP sent to your email. Please verify.");
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).send("Internal server error");
  }
});

// Verify OTP endpoint
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check for missing fields
    if (!email || !otp) {
      return res.status(400).send("Please fill all required fields");
    }

    // Find user by email
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).send("Invalid email or OTP");
    }

    // Check if OTP matches and is not expired
    if (user.otp !== otp || user.otpExpiresAt < Date.now()) {
      return res.status(400).send("Invalid or expired OTP");
    }

    // Clear OTP fields after successful verification
    user.otp = null;
    user.otpExpiresAt = null;

    // Create JWT token
    const payload = {
      userId: user._id,
      email: user.email,
    };
    const JWT_SECRET_KEY =
      process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";

    const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: "1d" });

    user.token = token;
    await user.save();

    // Respond with the token and user details
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
      token: token,
    });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    return res.status(500).send("Internal server error");
  }
});

// app.post("/api/login", async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       res.status(400).send("Please fill all required fields");
//     } else {
//       const user = await Users.findOne({ email });
//       if (!user) {
//         res.status(400).send("User email or password is incorrect");
//       } else {
//         const validateUser = await bcryptjs.compare(password, user.password);
//         if (!validateUser) {
//           res.status(400).send("User email or password is incorrect");
//         } else {
//           const payload = {
//             userId: user._id,
//             email: user.email,
//           };
//           const JWT_SECRET_KEY =
//             process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";

//           jwt.sign(
//             payload,
//             JWT_SECRET_KEY,
//             { expiresIn: 84600 },
//             async (err, token) => {
//               await Users.updateOne(
//                 { _id: user._id },
//                 {
//                   $set: { token },
//                 }
//               );
//               user.save();
//               return res.status(200).json({
//                 user: {
//                   id: user._id,
//                   email: user.email,
//                   fullName: user.fullName,
//                 },
//                 token: token,
//               });
//             }
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.log(error, "Error");
//   }
// });

app.post("/api/conversation", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const newCoversation = new Conversations({
      members: [senderId, receiverId],
    });
    await newCoversation.save();
    res.status(200).send("Conversation created successfully");
  } catch (error) {
    console.log(error, "Error");
  }
});

app.get("/api/conversations/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversations.find({
      members: { $in: [userId] },
    });
    const conversationUserData = Promise.all(
      conversations.map(async (conversation) => {
        const receiverId = conversation.members.find(
          (member) => member !== userId
        );
        const user = await Users.findById(receiverId);
        return {
          user: {
            receiverId: user._id,
            email: user.email,
            fullName: user.fullName,
          },
          conversationId: conversation._id,
        };
      })
    );
    res.status(200).json(await conversationUserData);
  } catch (error) {
    console.log(error, "Error");
  }
});

app.post("/api/message", async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;

    if (!senderId || !message)
      return res.status(400).send("Please fill all required fields");
    if (conversationId === "new" && receiverId) {
      const newCoversation = new Conversations({
        members: [senderId, receiverId],
      });
      await newCoversation.save();
      const newMessage = new Messages({
        conversationId: newCoversation._id,
        senderId,
        message,
      });
      await newMessage.save();
      return res.status(200).send("Message sent successfully");
    } else if (!conversationId && !receiverId) {
      return res.status(400).send("Please fill all required fields");
    }
    const newMessage = new Messages({ conversationId, senderId, message });
    await newMessage.save();
    res.status(200).send("Message sent successfully");
  } catch (error) {
    console.log(error, "Error");
  }
});

app.get("/api/message/:conversationId", async (req, res) => {
  try {
    const checkMessages = async (conversationId) => {
      console.log(conversationId, "conversationId");
      const messages = await Messages.find({ conversationId });
      const messageUserData = Promise.all(
        messages.map(async (message) => {
          const user = await Users.findById(message.senderId);
          return {
            user: { id: user._id, email: user.email, fullName: user.fullName },
            message: message.message,
          };
        })
      );
      res.status(200).json(await messageUserData);
    };
    const conversationId = req.params.conversationId;
    if (conversationId === "new") {
      const checkConversation = await Conversations.find({
        members: { $all: [req.query.senderId, req.query.receiverId] },
      });
      if (checkConversation.length > 0) {
        checkMessages(checkConversation[0]._id);
      } else {
        return res.status(200).json([]);
      }
    } else {
      checkMessages(conversationId);
    }
  } catch (error) {
    console.log("Error", error);
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const users = await Users.find({ _id: { $ne: userId } });
    const usersData = Promise.all(
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
    res.status(200).json(await usersData);
  } catch (error) {
    console.log("Error", error);
  }
});

// Create a new notification
app.post("/api/notifications", async (req, res) => {
  try {
    const { conversationId, senderId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).send("User ID and message are required.");
    }

    const newNotification = new Notifications({
      conversationId,
      senderId,
      message,
    });

    await newNotification.save();
    res.status(200).send("Notification created successfully.");
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).send("Server error.");
  }
});

// Get all profiles
app.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await UserProfile.find(); // Fetch all profiles
    res.status(200).json(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Failed to fetch profiles", error });
  }
});

// Get a specific user profile by userId
app.get("/api/profiles/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({ userId }); // Find by userId
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile", error });
  }
});

// Insert (or update) a user profile
app.post("/api/profiles", async (req, res) => {
  try {
    const {
      userId,
      userName,
      gender,
      bio,
      location,
      profilePicture,
      socialLinks,
    } = req.body;
    console.log(
      "Profile Data:",
      userId,
      userName,
      gender,
      bio,
      location,
      profilePicture,
      socialLinks
    );

    // Check if a profile already exists
    let profile = await UserProfile.findOne({ userId });
    console.log("Existing profile:", profile);

    if (profile) {
      // Update the existing profile
      profile = await UserProfile.findOneAndUpdate(
        { userId },
        { userName, gender, bio, location, profilePicture, socialLinks },
        { new: true, runValidators: true }
      );
      return res.status(200).json({ message: "Profile updated", profile });
    }

    // Create a new profile
    profile = new UserProfile({
      userId,
      userName,
      gender,
      bio,
      location,
      profilePicture,
      socialLinks,
    });

    await profile.save();
    res.status(201).json({ message: "Profile created", profile });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ message: "Failed to save profile", error });
  }
});

app.listen(port, () => {
  console.log("listening on port " + port);
});
