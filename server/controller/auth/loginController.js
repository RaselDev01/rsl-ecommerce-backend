const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../model/userSchema");

const JWT_EXPIRY = "30d";

async function loginController(req, res) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured properly",
      });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: sanitizedEmail,
      deletedAt: null,
    }).select("+password +tokenVersion");

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!existingUser.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is deactivated. Please reactivate your account.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const verificationMethod =
      existingUser.preferredVerificationMethod;

    if (
      verificationMethod != null &&
      !["email", "sms"].includes(verificationMethod)
    ) {
      return res.status(403).json({
        success: false,
        message: "Account verification configuration is invalid",
      });
    }

    if (
      verificationMethod === "email" &&
      !existingUser.emailVerified
    ) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        data: {
          userId: existingUser._id,
          verificationMethod: "email",
          emailVerified: false,
        },
      });
    }

    if (
      verificationMethod === "sms" &&
      !existingUser.phoneVerified
    ) {
      return res.status(403).json({
        success: false,
        message: "Please verify your phone number before logging in",
        data: {
          userId: existingUser._id,
          verificationMethod: "sms",
          phoneVerified: false,
        },
      });
    }

    const tokenVersion = Number(
      existingUser.tokenVersion ?? 0
    );

    if (
      !Number.isSafeInteger(tokenVersion) ||
      tokenVersion < 0
    ) {
      console.error("Invalid tokenVersion for user:", existingUser._id);

      return res.status(500).json({
        success: false,
        message: "Unable to authenticate account",
      });
    }

    const token = jwt.sign(
      {
        id: existingUser._id.toString(),
        email: existingUser.email,
        role: existingUser.role,
        tokenVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          role: existingUser.role,
          emailVerified: existingUser.emailVerified,
          phoneVerified: existingUser.phoneVerified,
          preferredVerificationMethod: verificationMethod,
        },
      },
    });
  } catch (error) {
    console.error("Login Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again later.",
    });
  }
}

module.exports = loginController;