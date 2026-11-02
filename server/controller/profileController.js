const User = require("../model/userSchema");
const bcrypt = require("bcrypt");


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

const changeMyPasswordController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        typeof confirmNewPassword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password fields must be valid strings",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation password do not match",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(
      `[ChangePasswordController Error][${new Date().toISOString()}]:`,
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

const deleteMyAccountController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Missing user identification",
      });
    }

    const { password } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Password must be a valid non-empty string",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Resource not found: User account does not exist",
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: "Bad request: Account is already deactivated",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed: Incorrect password credentials",
      });
    }

    user.isActive = false;
    user.deletedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error(`[DeleteAccountController Error][${new Date().toISOString()}]:`, error);

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while deactivating account",
    });
  }
};


module.exports = {
  getMyProfileController,
  updateMyProfileController,
  changeMyPasswordController,
  deleteMyAccountController,
};

