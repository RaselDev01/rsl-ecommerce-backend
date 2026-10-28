const Coupon = require("../../model/couponSchema");

const adminCreateCouponController = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      startDate,
      expiryDate,
      usageLimit,
      perUserLimit,
      isActive,
    } = req.body;

    if (
      !code ||
      !discountType ||
      discountValue === undefined ||
      !startDate ||
      !expiryDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Code, discount type, discount value, start date and expiry date are required.",
      });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,30}$/.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon code format.",
      });
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Discount type must be percentage or fixed.",
      });
    }

    const value = Number(discountValue);

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (discountType === "percentage" && value > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount value must be greater than 0. Percentage discount cannot exceed 100.",
      });
    }

    const minimumAmount = Number(minimumOrderAmount ?? 0);

    if (!Number.isFinite(minimumAmount) || minimumAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum order amount must be a valid non-negative number.",
      });
    }

    let maximumAmount = null;

    if (maximumDiscountAmount !== undefined && maximumDiscountAmount !== null) {
      maximumAmount = Number(maximumDiscountAmount);

      if (!Number.isFinite(maximumAmount) || maximumAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "Maximum discount amount must be a valid non-negative number.",
        });
      }
    }

    const start = new Date(startDate);
    const expiry = new Date(expiryDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(expiry.getTime()) ||
      expiry <= start
    ) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be later than the start date.",
      });
    }

    let limit = null;

    if (usageLimit !== undefined && usageLimit !== null) {
      limit = Number(usageLimit);

      if (!Number.isInteger(limit) || limit < 1) {
        return res.status(400).json({
          success: false,
          message: "Usage limit must be a positive whole number.",
        });
      }
    }

    const userLimit = Number(perUserLimit ?? 1);

    if (!Number.isInteger(userLimit) || userLimit < 1) {
      return res.status(400).json({
        success: false,
        message: "Per-user limit must be a positive whole number.",
      });
    }

    const existingCoupon = await Coupon.findOne({ code: normalizedCode }).select("_id").lean();

    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: "This coupon code already exists.",
      });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      description,
      discountType,
      discountValue: value,
      minimumOrderAmount: minimumAmount,
      maximumDiscountAmount: maximumAmount,
      startDate: start,
      expiryDate: expiry,
      usageLimit: limit,
      perUserLimit: userLimit,
      isActive: isActive ?? true,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      data: coupon,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This coupon code already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while creating the coupon.",
    });
  }
};

module.exports = adminCreateCouponController;
