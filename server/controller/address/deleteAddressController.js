const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");

async function deleteAddressController(req, res) {
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

    const deletedAddress = await Address.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    if (deletedAddress.isDefault) {
      await Address.updateMany(
        { user: userId },
        { $set: { isDefault: false } },
      );

      const nextLatestAddress = await Address.findOne({ user: userId }).sort({
        createdAt: -1,
      });

      if (nextLatestAddress) {
        nextLatestAddress.isDefault = true;
        await nextLatestAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error) {
    console.error("Error in deleteAddressController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
}


module.exports = deleteAddressController;
