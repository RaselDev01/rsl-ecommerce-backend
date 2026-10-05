const Address = require("../../model/addressSchema");

async function addAddressController(req, res) {
  try {
    const userId = req.user.id;

    const {
      fullName,
      phone,
      email,
      addressLine,
      road,
      area,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    if (!fullName || !phone || !addressLine || !area || !city || !postalCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required address fields",
      });
    }

    const totalAddresses = await Address.countDocuments({ user: userId });
    
    let shouldBeDefault = totalAddresses === 0 ? true : (isDefault === true || String(isDefault) === "true");

    if (shouldBeDefault) {
      await Address.updateMany(
        { user: userId },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = await Address.create({
      user: userId,
      fullName,
      phone,
      email,
      addressLine,
      road,
      area,
      city,
      state,
      postalCode,
      country: country || undefined,
      addressType,
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: newAddress,
    });

  } catch (error) {
    console.error("Error in addAddressController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Failed to add address.",
    });
  }
}

module.exports = addAddressController;
