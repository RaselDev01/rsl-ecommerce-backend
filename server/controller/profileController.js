const User = require("../model/userSchema");

const getMyProfileController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Missing user identification",
      });
    }

    const user = await User.findById(userId).select("-password -__v").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Resource not found: User account does not exist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error(
      `[ProfileController Error][${new Date().toISOString()}]:`,
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while retrieving profile",
    });
  }
};

const updateMyProfileController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Missing user identification",
      });
    }

    const { name } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name must be a valid non-empty string",
        });
      }

      updateData.name = name.trim();
    }

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bad request: Provide at least one field to update",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    )
      .select("-password -__v")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Resource not found: User account does not exist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(
      `[UpdateProfileController Error][${new Date().toISOString()}]:`,
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating profile",
    });
  }
};

module.exports = {
  getMyProfileController,
  updateMyProfileController,
};
