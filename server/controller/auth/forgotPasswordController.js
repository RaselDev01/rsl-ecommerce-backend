const User = require("../../model/userSchema");
const sendEmail = require("../../helpers/sendEmail");
const { generateOtp, hashOtp } = require("../../helpers/otpHelper");

async function forgotPasswordController(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    const genericResponse = {
      success: true,
      message:
        "If an eligible account exists, a password reset OTP will be sent to the registered email address.",
    };

    const user = await User.findOne({
      email: sanitizedEmail,
      isActive: true,
      deletedAt: null,
    }).select("+passwordResetOtpLastSentAt");

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const isLegacyAccount =
      user.preferredVerificationMethod == null;

    const isVerifiedEmail =
      user.emailVerified === true;

    if (!isLegacyAccount && !isVerifiedEmail) {
      return res.status(200).json(genericResponse);
    }

    const now = new Date();
    const cooldown = 60 * 1000;

    if (
      user.passwordResetOtpLastSentAt &&
      now.getTime() -
        user.passwordResetOtpLastSentAt.getTime() <
        cooldown
    ) {
      const remainingSeconds = Math.ceil(
        (
          cooldown -
          (
            now.getTime() -
            user.passwordResetOtpLastSentAt.getTime()
          )
        ) / 1000
      );

      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
        retryAfter: remainingSeconds,
      });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpires = new Date(
      now.getTime() + 5 * 60 * 1000
    );
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpLastSentAt = now;

    await user.save();

    try {
      const safeName = user.name.replace(
        /[&<>"']/g,
        (character) => {
          const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          };

          return entities[character];
        }
      );

      await sendEmail(
        user.email,
        "Password Reset OTP - Journal Ecommerce",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #111827;">Reset Your Password</h2>
            <p>Hello ${safeName},</p>
            <p>You requested to reset your password for your Journal Ecommerce account.</p>
            <p>Use the following verification code to proceed:</p>
            <div style="padding: 16px; background: #f3f4f6; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="letter-spacing: 8px; color: #111827; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in <strong>5 minutes</strong>.</p>
            <p>If you did not request this, please ignore this email.</p>
            <p>Please do not share this code with anyone.</p>
            <p>Regards,<br>Journal Ecommerce Team</p>
          </div>
        `
      );
    } catch (emailError) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetOtpAttempts = 0;
      user.passwordResetOtpLastSentAt = null;

      await user.save();

      throw emailError;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request. Please try again later.",
    });
  }
}

module.exports = forgotPasswordController;