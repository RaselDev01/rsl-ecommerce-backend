const mongoose = require("mongoose");
const Coupon = require("../../model/couponSchema");

const adminGetSingleCouponController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon ID.",
      });
    }

    const coupon = await Coupon.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon fetched successfully.",
      data: coupon,
    });
  } catch (error) {
    console.error("Admin Get Single Coupon Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while fetching the coupon.",
    });
  }
};

module.exports = adminGetSingleCouponController;
