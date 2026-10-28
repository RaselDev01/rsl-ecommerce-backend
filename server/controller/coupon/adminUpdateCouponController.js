const mongoose = require("mongoose");
const Coupon = require("../../model/couponSchema");

const adminUpdateCouponController = async (req, res) => {
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

    const allowedFields = [
      "description",
      "discountType",
      "discountValue",
      "minimumOrderAmount",
      "maximumDiscountAmount",
      "startDate",
      "expiryDate",
      "usageLimit",
      "perUserLimit",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const discountType = updates.discountType ?? coupon.discountType;
    const discountValue = updates.discountValue ?? coupon.discountValue;

    if (
      !["percentage", "fixed"].includes(discountType) ||
      !Number.isFinite(Number(discountValue)) ||
      Number(discountValue) <= 0 ||
      (discountType === "percentage" && Number(discountValue) > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount type or discount value.",
      });
    }

    if (updates.minimumOrderAmount !== undefined) {
      const amount = Number(updates.minimumOrderAmount);

      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum order amount must be non-negative.",
        });
      }

      updates.minimumOrderAmount = amount;
    }

    if (updates.maximumDiscountAmount !== undefined) {
      if (updates.maximumDiscountAmount === null) {
        updates.maximumDiscountAmount = null;
      } else {
        const amount = Number(updates.maximumDiscountAmount);

        if (!Number.isFinite(amount) || amount < 0) {
          return res.status(400).json({
            success: false,
            message: "Maximum discount amount must be non-negative.",
          });
        }

        updates.maximumDiscountAmount = amount;
      }
    }

    if (updates.usageLimit !== undefined) {
      if (updates.usageLimit === null) {
        updates.usageLimit = null;
      } else {
        const limit = Number(updates.usageLimit);

        if (!Number.isInteger(limit) || limit < coupon.usageCount || limit < 1) {
          return res.status(400).json({
            success: false,
            message: "Usage limit must be a positive integer and cannot be less than current usage count.",
          });
        }

        updates.usageLimit = limit;
      }
    }

    if (updates.perUserLimit !== undefined) {
      const limit = Number(updates.perUserLimit);

      if (!Number.isInteger(limit) || limit < 1) {
        return res.status(400).json({
          success: false,
          message: "Per-user limit must be a positive integer.",
        });
      }

      updates.perUserLimit = limit;
    }

    if (updates.startDate !== undefined) {
      updates.startDate = new Date(updates.startDate);

      if (Number.isNaN(updates.startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date.",
        });
      }
    }

    if (updates.expiryDate !== undefined) {
      updates.expiryDate = new Date(updates.expiryDate);

      if (Number.isNaN(updates.expiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date.",
        });
      }
    }

    const startDate = updates.startDate ?? coupon.startDate;
    const expiryDate = updates.expiryDate ?? coupon.expiryDate;

    if (new Date(expiryDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be later than the start date.",
      });
    }

    if (updates.discountType !== undefined) {
      coupon.discountType = updates.discountType;
    }

    if (updates.discountValue !== undefined) {
      coupon.discountValue = Number(updates.discountValue);
    }

    for (const [field, value] of Object.entries(updates)) {
      if (!["discountType", "discountValue"].includes(field)) {
        coupon.set(field, value);
      }
    }

    const updatedCoupon = await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully.",
      data: updatedCoupon,
    });
  } catch (error) {
    console.error("Admin Update Coupon Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating the coupon.",
    });
  }
};

module.exports = adminUpdateCouponController;
