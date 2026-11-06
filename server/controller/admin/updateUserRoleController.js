const mongoose = require("mongoose");
const User = require("../../model/userSchema");

async function updateUserRoleController(req, res) {
  try {
    const actorRole = req.user?.role;
    const actorId = req.user?.id;

    if (!actorRole || !actorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (actorRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can update user roles",
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!role || typeof role !== "string") {
      return res.status(400).json({
        success: false,
        message: "Role is required and must be a valid string",
      });
    }

    const sanitizedRole = role.trim().toLowerCase();

    const allowedRoles = ["admin", "manager", "staff", "customer"];

    if (!allowedRoles.includes(sanitizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: admin, manager, staff, customer",
      });
    }

    if (id === actorId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Super Admin role cannot be changed",
      });
    }

    if (targetUser.role === sanitizedRole) {
      return res.status(400).json({
        success: false,
        message: `User already has the ${sanitizedRole} role`,
      });
    }

    const previousRole = targetUser.role;

    targetUser.role = sanitizedRole;

    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        previousRole,
        currentRole: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error(
      `[UpdateUserRoleController Error][${new Date().toISOString()}]:`,
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating user role",
    });
  }
}

module.exports = updateUserRoleController;