const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");

async function updateAddressController(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: User ID not found.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID format.",
      });
    }

    const updateFields = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (value !== undefined) {
        updateFields[key] = value;
      }
    }

    if (updateFields.isDefault === true) {
      await Address.updateMany(
        { user: userId, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    const updatedAddress = await Address.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: updatedAddress,
    });

  } catch (error) {
    console.error("Error in updateAddressController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
}

module.exports = updateAddressController;
