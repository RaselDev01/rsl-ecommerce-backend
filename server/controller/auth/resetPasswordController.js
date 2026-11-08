const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../../model/userSchema");

const BCRYPT_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

async function resetPasswordController(req, res) {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (
      typeof resetToken !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Reset token and password fields are required",
      });
    }

    const sanitizedToken = resetToken.trim();

    if (!/^[a-f0-9]{64}$/.test(sanitizedToken)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    const passwordByteLength = Buffer.byteLength(
      newPassword,
      "utf8"
    );

    if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      passwordByteLength > MAX_PASSWORD_BYTES
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters and cannot exceed 72 bytes",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(sanitizedToken)
      .digest("hex");

    const now = new Date();

    const user = await User.findOne({
      passwordResetTokenHash: resetTokenHash,
      passwordResetTokenExpires: { $gt: now },
      isActive: true,
      deletedAt: null,
    }).select("_id");

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid, expired, or already used password reset token",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        passwordResetTokenHash: resetTokenHash,
        passwordResetTokenExpires: { $gt: new Date() },
        isActive: true,
        deletedAt: null,
      },
      {
        $set: {
          password: hashedPassword,

          passwordResetTokenHash: null,
          passwordResetTokenExpires: null,

          passwordResetOtpHash: null,
          passwordResetOtpExpires: null,
          passwordResetOtpAttempts: 0,
          passwordResetOtpLastSentAt: null,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("_id");

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid, expired, or already used password reset token",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please log in using your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password. Please try again later.",
    });
  }
}

module.exports = resetPasswordController;