const mongoose = require("mongoose");
const User = require("../../model/userSchema");
const { verifyOtp } = require("../../helpers/otpHelper");

const MAX_OTP_ATTEMPTS = 5;

async function verifyRegistrationOtpController(req, res) {
  try {
    const { userId, otp } = req.body;

    if (
      typeof userId !== "string" ||
      typeof otp !== "string"
    ) {
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

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a valid 6-digit number",
      });
    }

    const user = await User.findOne({
      _id: userId,
      isActive: true,
      deletedAt: null,
    }).select(
      "+verificationOtpHash +verificationOtpExpires +verificationOtpAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
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
        message:
          "No active verification OTP found. Please request a new OTP.",
      });
    }

    const now = new Date();

    if (user.verificationOtpExpires <= now) {
      await User.updateOne(
        {
          _id: user._id,
          verificationOtpHash: user.verificationOtpHash,
          verificationOtpExpires: { $lte: now },
        },
        {
          $set: {
            verificationOtpHash: null,
            verificationOtpExpires: null,
            verificationOtpAttempts: 0,
            verificationOtpLastSentAt: null,
          },
        }
      );

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.verificationOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message:
          "Maximum OTP verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isValidOtp = verifyOtp(
      otp,
      user.verificationOtpHash
    );

    const otpFilter = {
      _id: user._id,
      isActive: true,
      deletedAt: null,
      preferredVerificationMethod: verificationMethod,
      verificationOtpHash: user.verificationOtpHash,
      verificationOtpExpires: { $gt: new Date() },
      verificationOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
      ...(verificationMethod === "email"
        ? { emailVerified: false }
        : { phoneVerified: false }),
    };

    if (!isValidOtp) {
      const updatedUser = await User.findOneAndUpdate(
        otpFilter,
        {
          $inc: {
            verificationOtpAttempts: 1,
          },
        },
        {
          new: true,
        }
      ).select("+verificationOtpAttempts");

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
          MAX_OTP_ATTEMPTS - updatedUser.verificationOtpAttempts
        ),
      });
    }

    const verificationUpdate =
      verificationMethod === "email"
        ? { emailVerified: true }
        : { phoneVerified: true };

    const verifiedUser = await User.findOneAndUpdate(
      otpFilter,
      {
        $set: {
          ...verificationUpdate,
          verificationOtpHash: null,
          verificationOtpExpires: null,
          verificationOtpAttempts: 0,
          verificationOtpLastSentAt: null,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "_id name email phone preferredVerificationMethod emailVerified phoneVerified role"
    );

    if (!verifiedUser) {
      return res.status(400).json({
        success: false,
        message:
          "OTP expired, already used, or verification failed. Please request a new OTP if necessary.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account verification completed successfully",
      data: {
        userId: verifiedUser._id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        phone: verifiedUser.phone,
        preferredVerificationMethod:
          verifiedUser.preferredVerificationMethod,
        emailVerified: verifiedUser.emailVerified,
        phoneVerified: verifiedUser.phoneVerified,
        role: verifiedUser.role,
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