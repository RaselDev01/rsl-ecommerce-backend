const mongoose = require("mongoose");
const User = require("../../model/userSchema");
const { verifyOtp } = require("../../helpers/otpHelper");

async function verifyRegistrationOtpController(req, res) {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a valid 6-digit number",
      });
    }

    const user = await User.findById(userId).select(
      "+verificationOtpHash +verificationOtpExpires +verificationOtpAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    if (!user.isActive || user.deletedAt) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive",
      });
    }

    const verificationMethod = user.preferredVerificationMethod;

    if (!["email", "sms"].includes(verificationMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification method",
      });
    }

    if (
      (verificationMethod === "email" && user.emailVerified) ||
      (verificationMethod === "sms" && user.phoneVerified)
    ) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified",
      });
    }

    if (
      (verificationMethod === "email" && !user.email) ||
      (verificationMethod === "sms" && !user.phone)
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification contact information is missing",
      });
    }

    if (!user.verificationOtpHash || !user.verificationOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "No active verification OTP found. Please request a new OTP.",
      });
    }

    if (user.verificationOtpExpires.getTime() <= Date.now()) {
      user.verificationOtpHash = null;
      user.verificationOtpExpires = null;
      user.verificationOtpAttempts = 0;
      user.verificationOtpLastSentAt = null;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.verificationOtpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message:
          "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isValidOtp = verifyOtp(
      String(otp),
      user.verificationOtpHash
    );

    if (!isValidOtp) {
      user.verificationOtpAttempts += 1;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        remainingAttempts: Math.max(
          0,
          5 - user.verificationOtpAttempts
        ),
      });
    }

    if (verificationMethod === "email") {
      user.emailVerified = true;
    } else {
      user.phoneVerified = true;
    }

    user.verificationOtpHash = null;
    user.verificationOtpExpires = null;
    user.verificationOtpAttempts = 0;
    user.verificationOtpLastSentAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account verification completed successfully",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferredVerificationMethod: verificationMethod,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration OTP Verification Error:", error);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed. Please try again later.",
    });
  }
}

module.exports = verifyRegistrationOtpController;