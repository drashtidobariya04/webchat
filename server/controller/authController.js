const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Users = require("../models/Users"); // Adjust the path based on your project structure

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).send("Please fill all required fields");
    }

    const isAlreadyExist = await Users.findOne({ email });
    if (isAlreadyExist) {
      return res.status(400).send("User already exists");
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = new Users({ fullName, email, password: hashedPassword });

    await newUser.save();
    return res.status(200).send("User registered successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).send("An error occurred during registration");
  }
};

// Log in a user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Please fill all required fields");
    }

    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).send("User email or password is incorrect");
    }

    const validateUser = await bcryptjs.compare(password, user.password);
    if (!validateUser) {
      return res.status(400).send("User email or password is incorrect");
    }

    const payload = {
      userId: user._id,
      email: user.email,
    };

    jwt.sign(
      payload,
      JWT_SECRET_KEY,
      { expiresIn: 84600 },
      async (err, token) => {
        if (err) {
          return res
            .status(500)
            .send("An error occurred during token generation");
        }

        await Users.updateOne({ _id: user._id }, { $set: { token } });

        return res.status(200).json({
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
          },
          token: token,
        });
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).send("An error occurred during login");
  }
};

module.exports = {
  registerUser,
  loginUser,
};
