const User = require("../../model/userSchema");
const bcrypt = require("bcrypt");
const emailValidation = require("../../helpers/emailValidation");

async function createAdminUserController(req, res) {
  try {
    const actorRole = req.user?.role;

    if (!actorRole || !["super_admin", "admin"].includes(actorRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Insufficient permissions",
      });
    }

    const { name, email, password, role } = req.body;

    if (
      !name ||
      typeof name !== "string" ||
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string" ||
      !role ||
      typeof role !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: All fields are required and must be valid strings",
      });
    }

    const sanitizedName = name.trim();
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedRole = role.trim().toLowerCase();

    if (!sanitizedName) {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    if (!emailValidation(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const allowedRoles = ["admin", "manager", "staff"];

    if (!allowedRoles.includes(sanitizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Only admin, manager and staff accounts can be created",
      });
    }

    if (actorRole === "admin" && sanitizedRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin can only create manager and staff accounts",
      });
    }

    const sanitizedPassword = password;

    const existingUser = await User.findOne({
      email: sanitizedEmail,
    })
      .select("_id")
      .lean();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(sanitizedPassword, 12);

    const user = new User({
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      role: sanitizedRole,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: `${sanitizedRole} account created successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(
      `[CreateAdminUserController Error][${new Date().toISOString()}]:`,
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create administration account",
    });
  }
}

module.exports = createAdminUserController;