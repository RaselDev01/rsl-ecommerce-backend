const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../model/userSchema");

async function loginController(req, res) {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const sanitizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: sanitizedEmail,
    }).select("+password");

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!existingUser.isActive || existingUser.deletedAt) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is deactivated. Please reactivate your account.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const verificationMethod =
      existingUser.preferredVerificationMethod;

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

    if (
      verificationMethod != null &&
      !["email", "sms"].includes(verificationMethod)
    ) {
      return res.status(403).json({
        success: false,
        message: "Account verification configuration is invalid",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        id: existingUser._id,
        email: existingUser.email,
        role: existingUser.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
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