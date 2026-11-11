const User = require("../model/userSchema");
const bcrypt = require("bcrypt");
const fs = require("fs/promises");
const path = require("path");

const BCRYPT_SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_PASSWORD_BYTES = 72;

const uploadDirectory = path.join(process.cwd(), "uploads");

async function removeFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Profile Image Cleanup Error:", error);
    }
  }
}

function getProfileImagePath(imageUrl) {
  if (
    typeof imageUrl !== "string" ||
    !imageUrl.startsWith("/uploads/")
  ) {
    return null;
  }

  const filename = path.basename(imageUrl);
  const imagePath = path.resolve(uploadDirectory, filename);

  if (path.dirname(imagePath) !== path.resolve(uploadDirectory)) {
    return null;
  }

  return imagePath;
}

function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH &&
    Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES
  );
}

const getMyProfileController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const user = await User.findById(userId)
      .select(
        "_id name email phone profileImage preferredVerificationMethod emailVerified phoneVerified role isActive createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving profile.",
    });
  }
};

const updateMyProfileController = async (req, res) => {
  let newImageSaved = false;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const { name } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Name must contain between 1 and 100 characters.",
        });
      }

      updateData.name = name.trim();
    }

    if (Object.keys(updateData).length === 0 && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const oldImagePath = req.file
      ? getProfileImagePath(user.profileImage)
      : null;

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    Object.assign(user, updateData);

    await user.save();

    newImageSaved = Boolean(req.file);

    if (oldImagePath) {
      await removeFile(oldImagePath);
    }

    const updatedUser = await User.findById(userId)
      .select(
        "_id name email phone profileImage preferredVerificationMethod emailVerified phoneVerified role isActive createdAt updatedAt"
      )
      .lean();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating profile.",
    });
  } finally {
    if (!newImageSaved && req.file) {
      await removeFile(req.file.path);
    }
  }
};

const changeMyPasswordController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const {
      currentPassword,
      newPassword,
      confirmNewPassword,
    } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmNewPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmNewPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required.",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be 8-128 characters and cannot exceed 72 UTF-8 bytes.",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation password do not match.",
      });
    }

    const user = await User.findById(userId).select(
      "+password +tokenVersion"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (!user.isActive || user.deletedAt != null) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password.",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS
    );

    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while changing password.",
    });
  }
};

const deleteMyAccountController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const { password } = req.body;

    if (typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    const user = await User.findById(userId).select(
      "+password +tokenVersion"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (!user.isActive || user.deletedAt != null) {
      return res.status(400).json({
        success: false,
        message: "Account is already deactivated.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password.",
      });
    }

    user.isActive = false;
    user.deletedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully.",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while deactivating account.",
    });
  }
};

module.exports = {
  getMyProfileController,
  updateMyProfileController,
  changeMyPasswordController,
  deleteMyAccountController,
};