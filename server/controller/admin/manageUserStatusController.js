const mongoose = require("mongoose");
const User = require("../../model/userSchema");

async function manageUserStatusController(req, res) {
  try {
    const actorRole = req.user?.role;
    const actorId = req.user?.id;

    if (!actorRole || !actorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Missing actor identification credentials",
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Provided identifier format is malformed or missing",
      });
    }

    if (isActive === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Validation failed: 'isActive' attribute is required and must be a boolean value",
      });
    }

    if (id === actorId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Bad request: Administrative entities are restricted from mutating their own lifecycle status",
      });
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Resource not found: Target user account instance does not exist",
      });
    }

    if (targetUser.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: Root authority infrastructure accounts are protected from external state modifications",
      });
    }

    if (actorRole === "admin" && (targetUser.role === "admin" || targetUser.role === "super_admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Administrative clearance is insufficient to manage high-tier management profiles",
      });
    }

    if (targetUser.isActive === isActive) {
      return res.status(400).json({
        success: false,
        message: `Conflict detected: Target account state is already mapping to ${isActive ? "active" : "inactive"} status`,
      });
    }

    targetUser.isActive = isActive;
    targetUser.deletedAt = isActive ? null : new Date();

    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User account structure ${isActive ? "activated" : "deactivated"} successfully within system state`,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
        deletedAt: targetUser.deletedAt,
      },
    });
  } catch (error) {
    console.error(`[ManageUserStatusController Error][${new Date().toISOString()}]:`, error);

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while mutating resource lifecycle configuration",
    });
  }
}

module.exports = manageUserStatusController;
