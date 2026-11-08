const crypto = require("crypto");
const User = require("../../model/userSchema");
const { verifyOtp } = require("../../helpers/otpHelper");

const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY = 10 * 60 * 1000;

async function verifyPasswordResetOtpController(req, res) {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !email.trim() ||
      !otp.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedOtp = otp.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (!/^\d{6}$/.test(sanitizedOtp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a valid 6-digit number",
      });
    }

    const user = await User.findOne({
      email: sanitizedEmail,
      isActive: true,
      deletedAt: null,
    }).select(
      "+passwordResetOtpHash +passwordResetOtpExpires +passwordResetOtpAttempts"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset OTP",
      });
    }

    if (
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpires
    ) {
      return res.status(400).json({
        success: false,
        message: "No active password reset OTP found. Please request a new OTP.",
      });
    }

    const now = new Date();

    if (user.passwordResetOtpExpires.getTime() <= now.getTime()) {
      await User.updateOne(
        {
          _id: user._id,
          passwordResetOtpHash: user.passwordResetOtpHash,
        },
        {
          $set: {
            passwordResetOtpHash: null,
            passwordResetOtpExpires: null,
            passwordResetOtpAttempts: 0,
          },
        }
      );

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message:
          "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isValidOtp = verifyOtp(
      sanitizedOtp,
      user.passwordResetOtpHash
    );

    if (!isValidOtp) {
      const attemptUpdate = await User.updateOne(
        {
          _id: user._id,
          passwordResetOtpHash: user.passwordResetOtpHash,
          passwordResetOtpExpires: { $gt: now },
          passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
        },
        {
          $inc: {
            passwordResetOtpAttempts: 1,
          },
        }
      );

      if (attemptUpdate.modifiedCount === 0) {
        return res.status(429).json({
          success: false,
          message:
            "Maximum OTP verification attempts exceeded or OTP is no longer valid.",
        });
      }

      const remainingAttempts = Math.max(
        0,
        MAX_OTP_ATTEMPTS -
          (user.passwordResetOtpAttempts + 1)
      );

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        remainingAttempts,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const resetTokenExpires = new Date(
      now.getTime() + RESET_TOKEN_EXPIRY
    );

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isActive: true,
        deletedAt: null,
        passwordResetOtpHash: user.passwordResetOtpHash,
        passwordResetOtpExpires: { $gt: now },
        passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      {
        $set: {
          passwordResetTokenHash: resetTokenHash,
          passwordResetTokenExpires: resetTokenExpires,
          passwordResetOtpHash: null,
          passwordResetOtpExpires: null,
          passwordResetOtpAttempts: 0,
          passwordResetOtpLastSentAt: null,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is invalid, expired, or has already been used. Please request a new OTP.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully. You can now reset your password.",
      data: {
        resetToken,
        expiresIn: RESET_TOKEN_EXPIRY / 1000,
      },
    });
  } catch (error) {
    console.error("Verify Password Reset OTP Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify password reset OTP. Please try again later.",
    });
  }
}

module.exports = verifyPasswordResetOtpController;