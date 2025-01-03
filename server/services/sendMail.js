const nodemailer = require("nodemailer");
const Users = require("../models/Users");
const crypto = require("crypto"); // For generating OTP
// const sendMail = async (req, res) => {
//   try {
//     // Create a test account for development purposes (not needed in production)
//     let testAccount = await nodemailer.createTestAccount();

//     // Configure the transporter
//     const transporter = nodemailer.createTransport({
//       host: "smtp.ethereal.email",
//       port: 587,
//       secure: false, // true for 465, false for other ports
//       auth: {
//         user: "priscilla.rosenbaum@ethereal.email", // replace with your ethereal email
//         pass: "xTR8z88f7hPEMD8JDM", // replace with your ethereal password
//       },
//     });

//     // Set up email options
//     const info = await transporter.sendMail({
//       from: '"Drashti Dobariya 👻" <drashti@0804>', // sender address (must match the auth user)
//       to: "dobariyadrashti6@gmail.com, drashti.craftologicinfotech@gmail.com", // list of receivers
//       subject: "Hello Webchat login successfully ✔", // Subject line
//       text: "Hello WebChat 👻?", // plain text body
//       html: "<b>Hello WebChat</b>", // HTML body
//     });

//     // Log the message ID (useful for testing with Ethereal)
//     console.log("Message sent: %s", info.messageId);

//     // Respond with success
//     res.status(200).send("Mail sent successfully!");
//   } catch (error) {
//     console.error("Error sending mail:", error);
//     res.status(500).send("Error sending mail");
//   }
// };

// Configure nodemailer transporter
// const sendLoginEmail = async (userEmail) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       secure: true,
//       port: 465,
//       auth: {
//         user: "drashti.craftologicinfotech@gmail.com", // Your Gmail email address
//         pass: "plbo vivo lsol zrsx", // Your Gmail App Password
//       },
//     });

//     // Send the email
//     const info = await transporter.sendMail({
//       from: `"webChat" <"drashti.craftologicinfotech@gmail.com"`, // Sender address
//       to: userEmail, // Recipient email
//       subject: "Login Successful webChat ✔", // Subject line
//       text: "You have successfully logged into your account.", // Plain text body
//       html: "<b>You have successfully logged into your account.</b>", // HTML body
//     });

//     console.log("Login email sent: %s", info.messageId);
//   } catch (error) {
//     console.error("Error sending login email:", error);
//   }
// };

// Configure nodemailer transporter

const sendOTPEmail = async (userEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      port: 465,
      auth: {
        user: "drashti.craftologicinfotech@gmail.com", // Your Gmail email address
        pass: "plbo vivo lsol zrsx", // Your Gmail App Password
      },
    });

    // Send the OTP email
    const info = await transporter.sendMail({
      from: `"webChat" <drashti.craftologicinfotech@gmail.com>`, // Sender address
      to: userEmail, // Recipient email
      subject: "Your OTP for Login Verification ✔", // Subject line
      text: `Your OTP is: ${otp}`, // Plain text body
      html: `<b>Your OTP is: ${otp}</b>`, // HTML body
    });

    console.log("OTP email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
};

// Generate a random 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate OTP and store the expiration time (30 seconds)
const generateOTPWithExpiry = async (user) => {
  const otp = generateOTP();
  const otpExpiresAt = Date.now() + 30 * 1000; // Expiry time is 30 seconds

  // Store OTP and expiry time in the user document (assuming user is a MongoDB document)
  user.otp = otp;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  return otp; // Return OTP so it can be sent to the user
};

module.exports = { sendOTPEmail, generateOTP, generateOTPWithExpiry };
// module.exports = sendLoginEmail;
// module.exports = sendMail;
