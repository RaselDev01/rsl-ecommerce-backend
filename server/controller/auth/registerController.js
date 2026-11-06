const bcrypt = require("bcrypt");
const User = require("../../model/userSchema");
const sendEmail = require("../../helpers/sendEmail");
const validatePhoneNumber = require("../../helpers/phoneValidation");
const { generateOtp, hashOtp } = require("../../helpers/otpHelper");

async function registerController(req, res) {
  let createdUser = null;

  try {
    const {
      name,
      email,
      countryCode,
      phone,
      password,
      preferredVerificationMethod,
    } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and password are required",
      });
    }

    const sanitizedName = name.trim();
    const sanitizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : null;

    if (!sanitizedName || sanitizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 1 and 100 characters",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters",
      });
    }

    if (
      !["email", "sms"].includes(preferredVerificationMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Choose email or sms as verification method",
      });
    }

    if (
      sanitizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    let normalizedPhone = null;

    if (countryCode || phone) {
      if (!countryCode || !phone) {
        return res.status(400).json({
          success: false,
          message: "Both country code and phone number are required",
        });
      }

      normalizedPhone = validatePhoneNumber(countryCode, phone);

      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number",
        });
      }
    }

    if (
      preferredVerificationMethod === "email" &&
      !sanitizedEmail
    ) {
      return res.status(400).json({
        success: false,
        message: "Email is required for email verification",
      });
    }

    if (
      preferredVerificationMethod === "sms" &&
      !normalizedPhone
    ) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required for SMS verification",
      });
    }

    if (preferredVerificationMethod === "sms") {
      return res.status(503).json({
        success: false,
        message: "SMS verification is not configured yet",
      });
    }

    const duplicateConditions = [];

    if (sanitizedEmail) {
      duplicateConditions.push({ email: sanitizedEmail });
    }

    if (normalizedPhone) {
      duplicateConditions.push({ phone: normalizedPhone });
    }

    const existingUser = await User.findOne({
      $or: duplicateConditions,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with this email or phone number",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    const user = new User({
      name: sanitizedName,
      email: sanitizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      preferredVerificationMethod,
      emailVerified: false,
      phoneVerified: false,
      verificationOtpHash: otpHash,
      verificationOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
      verificationOtpAttempts: 0,
      verificationOtpLastSentAt: new Date(),
    });

    createdUser = await user.save();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #111827;">Verify Your Email</h2>
        <p>Hello ${sanitizedName},</p>
        <p>Thank you for registering with Journal Ecommerce.</p>
        <p>Your email verification OTP is:</p>
        <h1 style="letter-spacing: 8px; color: #0d9488;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you did not create this account, please ignore this email.</p>
        <br />
        <p>Regards,<br />Journal Ecommerce Team</p>
      </div>
    `;

    await sendEmail(
      sanitizedEmail,
      "Verify Your Journal Ecommerce Account",
      emailHtml
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email using the OTP sent to your inbox.",
      data: {
        userId: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        preferredVerificationMethod: createdUser.preferredVerificationMethod,
        emailVerified: createdUser.emailVerified,
      },
    });
  } catch (error) {
    if (createdUser) {
      await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with this email or phone number",
      });
    }

    console.error("Registration Error:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
}

module.exports = registerController; 