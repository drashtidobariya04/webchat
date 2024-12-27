const mongoose = require("mongoose");

// Use environment variables for sensitive information
const dbPassword = process.env.DB_PASSWORD || "webchat_admin04";
const url = `mongodb+srv://webchat_admin:${dbPassword}@cluster0.ulzl7.mongodb.net/?retryWrites=true&w=majority`;

mongoose
  .connect(url, {
    serverSelectionTimeoutMS: 30000, // 30 seconds timeout
  })
  .then(async () => {
    console.log("Connected to MongoDB using Mongoose");

    // Drop the index if it exists
    try {
      const result = await mongoose.connection
        .collection("conversations")
        .dropIndex("email_1");
      console.log("Index 'email_1' dropped successfully:", result);
    } catch (err) {
      if (err.codeName === "IndexNotFound") {
        console.log("Index 'email_1' does not exist.");
      } else {
        console.error("Error dropping index:", err);
      }
    }
  })
  .catch((err) => console.error("Mongoose connection error:", err));
