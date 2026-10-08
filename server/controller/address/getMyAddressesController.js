const Address = require("../../model/addressSchema");

async function getMyAddressesController(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: User ID not found.",
      });
    }

    const addresses = await Address.find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: addresses.length ? "Addresses fetched successfully." : "No addresses found.",
      count: addresses.length,
      data: addresses,
    });

  } catch (error) {
    console.error("Error in getMyAddressesController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
}

module.exports = getMyAddressesController;
