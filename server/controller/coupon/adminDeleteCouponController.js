const mongoose = require("mongoose");
const Coupon = require("../../model/couponSchema");

const adminDeleteCouponController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID.",
      });
    }

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    if (coupon.usageCount > 0) {
      return res.status(409).json({
        success: false,
        message: "This coupon has already been used. Deactivate it instead of deleting it.",
      });
    }

    await coupon.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
    });
  } catch (error) {
    console.error("Admin Delete Coupon Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while deleting the coupon.",
    });
  }
};

module.exports = adminDeleteCouponController;

