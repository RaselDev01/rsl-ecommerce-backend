const User = require("../../model/userSchema");
const { generateOtp, hashOtp } = require("../../helpers/otpHelper");
const sendEmail = require("../../helpers/sendEmail");
const sendSms = require("../../helpers/sendSms");

async function resendRegistrationOtpController(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(userId);

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

    const cooldown = 60 * 1000;
    const now = new Date();

    const otpData = await User.findById(userId).select(
      "+verificationOtpLastSentAt"
    );

    if (
      otpData.verificationOtpLastSentAt &&
      now.getTime() - otpData.verificationOtpLastSentAt.getTime() <
        cooldown
    ) {
      const remainingSeconds = Math.ceil(
        (cooldown -
          (now.getTime() -
            otpData.verificationOtpLastSentAt.getTime())) /
          1000
      );

      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
        retryAfter: remainingSeconds,
      });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

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

    user.verificationOtpHash = otpHash;
    user.verificationOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.verificationOtpAttempts = 0;
    user.verificationOtpLastSentAt = now;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `A new verification OTP has been sent successfully`,
      data: {
        userId: user._id,
        verificationMethod,
        expiresIn: 300,
        resendCooldown: 60,
      },
    });
  } catch (error) {
    console.error("Resend Registration OTP Error:", error);

    if (
      error.message === "Twilio configuration is incomplete"
    ) {
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