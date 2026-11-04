const User = require("../../model/userSchema");

async function verifyReactivationOtpController(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== "string" || !otp) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Email and OTP are required and must be valid payloads",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Resource not found: User account does not exist",
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: "Bad request: Account is already active",
      });
    }

    if (!user.reactivationOtp || !user.reactivationOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "Bad request: No active reactivation session found. Request a new OTP",
      });
    }

    if (user.reactivationOtpExpires < new Date()) {
      user.reactivationOtp = null;
      user.reactivationOtpExpires = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Validation failed: OTP has expired. Please request a new code",
      });
    }

    if (user.reactivationOtp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Invalid OTP credentials",
      });
    }

    user.isActive = true;
    user.deletedAt = null;
    user.reactivationOtp = null;
    user.reactivationOtpExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account reactivated successfully. Access granted for login authentication",
    });
  } catch (error) {
    console.error(`[VerifyReactivationOtpController Error][${new Date().toISOString()}]:`, error);

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while verifying reactivation OTP",
    });
  }
}

module.exports = verifyReactivationOtpController;
