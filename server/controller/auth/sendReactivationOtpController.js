const User = require("../../model/userSchema");
const sendEmail = require("../../helpers/sendEmail");
const { generateOtp, hashOtp } = require("../../helpers/otpHelper");

async function sendReactivationOtpController(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();

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

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    user.reactivationOtpHash = otpHash;
    user.reactivationOtpExpires = new Date(
      Date.now() + 5 * 60 * 1000
    );
    user.reactivationOtpAttempts = 0;

    await user.save();

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
      user.reactivationOtpHash = null;
      user.reactivationOtpExpires = null;
      user.reactivationOtpAttempts = 0;

      await user.save();

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: "Account reactivation OTP sent successfully",
      data: {
        expiresIn: 300,
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