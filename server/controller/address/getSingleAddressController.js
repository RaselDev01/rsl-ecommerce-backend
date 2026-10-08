const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");

async function getSingleAddressController(req, res) {
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

    const address = await Address.findOne({
      _id: id,
      user: userId,
    }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address fetched successfully.",
      data: address,
    });

  } catch (error) {
    console.error("Error in getSingleAddressController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
}

module.exports = getSingleAddressController;
