const mongoose = require("mongoose");
const User = require("../../model/userSchema");

async function deleteUserController(req, res) {
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

    if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Provided identifier format is malformed or missing",
      });
    }

    if (id === actorId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Bad request: Administrative entities are restricted from executing structural deletion on their own assets",
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
        message: "Access denied: Root authority infrastructure accounts are protected from external structural destruction",
      });
    }

    if (actorRole === "admin" && (targetUser.role === "admin" || targetUser.role === "super_admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Administrative clearance is insufficient to purge high-tier management profiles",
      });
    }

    if (!targetUser.isActive) {
      return res.status(400).json({
        success: false,
        message: "Conflict detected: Target account lifecycle state is already mapped to an inactive status",
      });
    }

    targetUser.isActive = false;
    targetUser.deletedAt = new Date();

    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User account context flagged as deleted successfully within target state",
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
    console.error(`[DeleteUserController Error][${new Date().toISOString()}]:`, error);

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while executing resource lifecycle purge configuration",
    });
  }
}

module.exports = deleteUserController;
