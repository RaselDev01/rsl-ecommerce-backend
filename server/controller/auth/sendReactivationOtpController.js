const User = require("../../model/userSchema");
const sendEmail = require("../../helpers/sendEmail");
const crypto = require("crypto");

async function sendReactivationOtpController(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Email must be a valid non-empty string",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Resource not found: User account does not exist for the provided email",
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: "Bad request: Account is already active",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.reactivationOtp = otp;
    user.reactivationOtpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    await sendEmail(
      user.email,
      "Account Reactivation OTP",
      `
        <h2>Account Reactivation</h2>
        <p>Your OTP for reactivating your Journal Ecommerce account is:</p>
        <h1 style="letter-spacing: 2px; color: #333;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    );

    return res.status(200).json({
      success: true,
      message: "Reactivation OTP sent successfully",
    });
  } catch (error) {
    console.error(
      `[SendReactivationOtpController Error][${new Date().toISOString()}]:`,
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while sending reactivation OTP",
      error: error.message,
    });
  }
}

module.exports = sendReactivationOtpController;