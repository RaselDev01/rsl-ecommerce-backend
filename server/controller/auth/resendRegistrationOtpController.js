const mongoose = require("mongoose");
const User = require("../../model/userSchema");
const { generateOtp, hashOtp } = require("../../helpers/otpHelper");
const sendEmail = require("../../helpers/sendEmail");
const sendSms = require("../../helpers/sendSms");

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;

async function resendRegistrationOtpController(req, res) {
  try {
    const { userId } = req.body;

    if (
      typeof userId !== "string" ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid user ID is required",
      });
    }

    const user = await User.findOne({
      _id: userId,
      isActive: true,
      deletedAt: null,
    });

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

    const now = new Date();
    const cooldownExpiry = new Date(now.getTime() - RESEND_COOLDOWN);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const verificationField =
      verificationMethod === "email"
        ? "emailVerified"
        : "phoneVerified";

    const reservedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isActive: true,
        deletedAt: null,
        [verificationField]: false,
        $or: [
          { verificationOtpLastSentAt: null },
          { verificationOtpLastSentAt: { $lte: cooldownExpiry } },
        ],
      },
      {
        $set: {
          verificationOtpHash: otpHash,
          verificationOtpExpires: new Date(now.getTime() + OTP_EXPIRY),
          verificationOtpAttempts: 0,
          verificationOtpLastSentAt: now,
        },
      },
      {
        new: true,
      }
    ).select("_id");

    if (!reservedUser) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
        retryAfter: 60,
      });
    }

    try {
      if (verificationMethod === "email") {
        const safeName = user.name.replace(/[&<>"']/g, (character) => {
          const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          };

          return entities[character];
        });

        await sendEmail(
          user.email,
          "Your New Account Verification OTP",
          `
            <div style="font-family: Arial, sans-serif;">
              <h2>Hello ${safeName},</h2>
              <p>Your new account verification OTP is:</p>
              <h1>${otp}</h1>
              <p>This OTP will expire in 5 minutes.</p>
              <p>Please do not share this code with anyone.</p>
            </div>
          `
        );
      } else {
        await sendSms(
          user.phone,
          `Your account verification OTP is ${otp}. It will expire in 5 minutes. Do not share this code.`
        );
      }
    } catch (deliveryError) {
      await User.updateOne(
        {
          _id: user._id,
          verificationOtpHash: otpHash,
        },
        {
          $set: {
            verificationOtpHash: null,
            verificationOtpExpires: null,
            verificationOtpAttempts: 0,
          },
        }
      );

      throw deliveryError;
    }

    return res.status(200).json({
      success: true,
      message: "A new verification OTP has been sent successfully",
      data: {
        userId: user._id,
        verificationMethod,
        expiresIn: 300,
        resendCooldown: 60,
      },
    });
  } catch (error) {
    console.error("Resend Registration OTP Error:", error);

    if (error.message === "Twilio configuration is incomplete") {
      return res.status(503).json({
        success: false,
        message: "SMS verification service is not configured yet",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to resend verification OTP. Please try again later.",
    });
  }
}

module.exports = resendRegistrationOtpController;