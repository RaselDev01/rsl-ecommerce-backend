const mongoose = require("mongoose");
const User = require("../../model/userSchema");
const { verifyOtp } = require("../../helpers/otpHelper");

async function verifyReactivationOtpController(req, res) {
  try {
    const { email, otp } = req.body;

    if (
      !email ||
      typeof email !== "string" ||
      !otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a valid 6-digit number",
      });
    }

    const user = await User.findOne({
      email: sanitizedEmail,
    }).select(
      "+reactivationOtpHash +reactivationOtpExpires +reactivationOtpAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    if (user.isActive && !user.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Account is already active",
      });
    }

    if (!user.reactivationOtpHash || !user.reactivationOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "No active reactivation OTP found. Please request a new OTP.",
      });
    }

    if (user.reactivationOtpExpires.getTime() <= Date.now()) {
      user.reactivationOtpHash = null;
      user.reactivationOtpExpires = null;
      user.reactivationOtpAttempts = 0;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.reactivationOtpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message:
          "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isValidOtp = verifyOtp(
      String(otp),
      user.reactivationOtpHash
    );

    if (!isValidOtp) {
      user.reactivationOtpAttempts += 1;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        remainingAttempts: Math.max(
          0,
          5 - user.reactivationOtpAttempts
        ),
      });
    }

    user.isActive = true;
    user.deletedAt = null;

    user.reactivationOtpHash = null;
    user.reactivationOtpExpires = null;
    user.reactivationOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account reactivated successfully",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Verify Reactivation OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify reactivation OTP. Please try again later.",
    });
  }
}

module.exports = verifyReactivationOtpController;