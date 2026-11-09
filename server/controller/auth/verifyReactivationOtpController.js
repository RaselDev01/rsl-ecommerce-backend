const User = require("../../model/userSchema");
const { verifyOtp } = require("../../helpers/otpHelper");

const MAX_OTP_ATTEMPTS = 5;

async function verifyReactivationOtpController(req, res) {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a valid 6-digit number",
      });
    }

    const user = await User.findOne({
      email: sanitizedEmail,
      isActive: false,
    }).select(
      "+reactivationOtpHash +reactivationOtpExpires +reactivationOtpAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Inactive user account not found",
      });
    }

    if (!user.reactivationOtpHash || !user.reactivationOtpExpires) {
      return res.status(400).json({
        success: false,
        message:
          "No active reactivation OTP found. Please request a new OTP.",
      });
    }

    const now = new Date();

    if (user.reactivationOtpExpires <= now) {
      await User.updateOne(
        {
          _id: user._id,
          reactivationOtpHash: user.reactivationOtpHash,
          reactivationOtpExpires: { $lte: now },
        },
        {
          $set: {
            reactivationOtpHash: null,
            reactivationOtpExpires: null,
            reactivationOtpAttempts: 0,
          },
        }
      );

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.reactivationOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message:
          "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isValidOtp = verifyOtp(
      otp,
      user.reactivationOtpHash
    );

    const otpFilter = {
      _id: user._id,
      isActive: false,
      reactivationOtpHash: user.reactivationOtpHash,
      reactivationOtpExpires: { $gt: new Date() },
      reactivationOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
    };

    if (!isValidOtp) {
      const updatedUser = await User.findOneAndUpdate(
        otpFilter,
        {
          $inc: {
            reactivationOtpAttempts: 1,
          },
        },
        {
          new: true,
        }
      ).select("+reactivationOtpAttempts");

      if (!updatedUser) {
        return res.status(429).json({
          success: false,
          message:
            "OTP expired or maximum verification attempts exceeded. Please request a new OTP.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        remainingAttempts: Math.max(
          0,
          MAX_OTP_ATTEMPTS - updatedUser.reactivationOtpAttempts
        ),
      });
    }

    const reactivatedUser = await User.findOneAndUpdate(
      otpFilter,
      {
        $set: {
          isActive: true,
          deletedAt: null,
          reactivationOtpHash: null,
          reactivationOtpExpires: null,
          reactivationOtpAttempts: 0,
          reactivationOtpLastSentAt: null,
        },
        $inc: {
          tokenVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("_id name email role isActive");

    if (!reactivatedUser) {
      return res.status(400).json({
        success: false,
        message:
          "OTP expired, already used, or reactivation failed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account reactivated successfully",
      data: {
        userId: reactivatedUser._id,
        name: reactivatedUser.name,
        email: reactivatedUser.email,
        role: reactivatedUser.role,
        isActive: reactivatedUser.isActive,
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