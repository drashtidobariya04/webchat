const express = require("express");

const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const io = require("socket.io")(8080, {
  cors: {
    origin: "http://localhost:3000",
  },
});
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Import fs module to handle file system operations

const { sendOTPEmail, generateOTP } = require("./services/sendMail");

// Connect DB
require("./db/connection");
// Import Files
const Users = require("./models/Users");
const Conversations = require("./models/Conversations");
const Messages = require("./models/Messages");
const Notice = require("./models/Calendar");
// const upload = require("./services/uploadsPicture");
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
// Create the 'uploads' folder if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true }); // Create 'uploads' directory recursively if it doesn't exist
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Folder where images will be stored (ensure this exists or create it)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    ); // Unique filename for each image
  },
});

const upload = multer({ storage: storage });

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

// // Verify OTP endpoint
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
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Generate OTP and store it in the user document with expiration time (30 seconds)
    const otp = generateOTP();
    const otpExpiresAt = Date.now() + 30 * 1000; // OTP expires in 30 seconds
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp);

    // Respond with success message
    return res.status(200).send("OTP sent to your email. Please verify.");
  } catch (error) {
    console.error(error);
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

// Route to handle sending messages and uploading images
// Post route for sending a message with an optional image
app.post("/api/message", upload.single("image"), async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;

    // Handle image URL (if any) from the upload process
    const imageUrl = req.file ? `uploads/${req.file.filename}` : null;

    if (!senderId || !message) {
      return res.status(400).send("Please fill all required fields");
    }

    // If it's a new conversation
    if (conversationId === "new" && receiverId) {
      const newConversation = new Conversations({
        members: [senderId, receiverId],
      });
      await newConversation.save();

      const newMessage = new Messages({
        conversationId: newConversation._id,
        senderId,
        message,
        image: imageUrl,
      });
      await newMessage.save();
      return res.status(200).send("Message sent successfully");
    }
    // If conversation exists, send the message to the existing conversation
    else if (!conversationId && !receiverId) {
      return res.status(400).send("Please fill all required fields");
    }

    const newMessage = new Messages({
      conversationId,
      senderId,
      message,
      image: imageUrl,
    });

    await newMessage.save();
    res.status(200).send("Message sent successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error sending message");
  }
});

// Get route for fetching messages in a conversation
app.get("/api/message/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

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
            image: message.image, // Include image URL if it's present
          };
        })
      );

      res.status(200).json(messageUserData);
    };

    if (conversationId === "new") {
      const checkConversation = await Conversations.find({
        members: { $all: [req.query.senderId, req.query.receiverId] },
      });

      if (checkConversation.length > 0) {
        return checkMessages(checkConversation[0]._id);
      } else {
        return res.status(200).json([]);
      }
    } else {
      await checkMessages(conversationId);
    }
  } catch (error) {
    console.error("Error fetching messages", error);
    res.status(500).send("Error fetching messages");
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
// app.get("/api/profiles", async (req, res) => {
//   try {
//     const profiles = await UserProfile.find(); // Fetch all profiles
//     res.status(200).json(profiles);
//   } catch (error) {
//     console.error("Error fetching profiles:", error);
//     res.status(500).json({ message: "Failed to fetch profiles", error });
//   }
// });

// // Endpoint to fetch a user profile by userId
// app.get("/api/profiles/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Validate if userId is a valid ObjectId
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid userId format" });
//     }

//     console.log("Looking for profile with userId:", userId); // Log userId for debugging

//     // Find the profile for the given userId, and optionally populate user details from the "Users" collection
//     const profile = await UserProfile.findOne({ userId })
//       .populate("userId", "email userFullName") // Replace with actual fields you need from Users collection
//       .exec();

//     // If profile not found, return 404 error
//     if (!profile) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Profile not found" });
//     }

//     // Return the found profile data
//     res.status(200).json({ success: true, profile });
//   } catch (error) {
//     // Log the error for debugging
//     console.error("Error fetching profile:", error);

//     // Return a 500 error if something goes wrong on the server
//     res
//       .status(500)
//       .json({ success: false, message: "Failed to fetch profile", error });
//   }
// });

// Define your API endpoint to handle profile updates (POST request)
app.post("/api/profiles", upload.single("profilePicture"), (req, res) => {
  const { userId, userName, gender, bio, location } = req.body;
  const profilePicture = req.file ? req.file.path : null;

  // Handle profile creation or updating logic here
  const updatedProfile = {
    userId,
    userName,
    gender,
    bio,
    location,
    profilePicture,
  };

  // Send response
  res.json({
    message: "Profile updated successfully",
    profile: updatedProfile,
  });
});

app.post("/api/notices", async (req, res) => {
  try {
    const { userId, title, description, date } = req.body;

    // Validate the request body
    if (!userId || !title || !date) {
      return res.status(400).send("Please fill all required fields");
    }

    // Check if the user exists
    const isUserExist = await Users.findById(userId); // Assuming Users is your User model
    if (!isUserExist) {
      return res.status(404).send("User not found");
    }

    // Create a new notice
    const newNotice = new Notice({
      userId,
      title,
      description,
      date,
    });

    // Save the notice
    await newNotice.save();

    return res.status(200).send("Notice added successfully");
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Failed to add notice");
  }
});

app.listen(port, () => {
  console.log("listening on port " + port);
});
