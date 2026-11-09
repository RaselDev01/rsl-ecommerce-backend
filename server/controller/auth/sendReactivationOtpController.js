const User = require("../../model/userSchema");
const sendEmail = require("../../helpers/sendEmail");
const { generateOtp, hashOtp } = require("../../helpers/otpHelper");

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;

async function sendReactivationOtpController(req, res) {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: sanitizedEmail,
    });

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

    const now = new Date();
    const cooldownExpiry = new Date(now.getTime() - RESEND_COOLDOWN);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const reservedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isActive: false,
        $or: [
          { reactivationOtpLastSentAt: null },
          { reactivationOtpLastSentAt: { $lte: cooldownExpiry } },
        ],
      },
      {
        $set: {
          reactivationOtpHash: otpHash,
          reactivationOtpExpires: new Date(now.getTime() + OTP_EXPIRY),
          reactivationOtpAttempts: 0,
          reactivationOtpLastSentAt: now,
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
        "Account Reactivation OTP",
        `
          <div style="font-family: Arial, sans-serif;">
            <h2>Hello ${safeName},</h2>
            <p>You requested to reactivate your account.</p>
            <p>Your account reactivation OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP will expire in 5 minutes.</p>
            <p>Please do not share this code with anyone.</p>
          </div>
        `
      );
    } catch (emailError) {
      await User.updateOne(
        {
          _id: user._id,
          reactivationOtpHash: otpHash,
        },
        {
          $set: {
            reactivationOtpHash: null,
            reactivationOtpExpires: null,
            reactivationOtpAttempts: 0,
          },
        }
      );

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "Account reactivation OTP sent successfully",
      data: {
        expiresIn: 300,
        resendCooldown: 60,
      },
    });
  } catch (error) {
    console.error("Send Reactivation OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send reactivation OTP. Please try again later.",
    });
  }
}

module.exports = sendReactivationOtpController;