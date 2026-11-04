const mongoose = require("mongoose");
const User = require("../../model/userSchema");

async function getSingleUserController(req, res) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Provided identifier format is malformed or missing",
      });
    }

    const user = await User.findById(id)
      .select("-password -reactivationOtp -reactivationOtpExpires -__v")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Resource not found: No user account maps to the provided identification",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error(`[GetSingleUserController Error][${new Date().toISOString()}]:`, error);

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while retrieving user details",
    });
  }
}

module.exports = getSingleUserController;
