const Coupon = require("../../model/couponSchema");

async function validateCoupon({
  couponCode,
  subtotal,
  userId,
  session,
}) {
  if (!couponCode || typeof couponCode !== "string") {
    const error = new Error("Please provide a valid coupon code.");
    error.statusCode = 400;
    throw error;
  }

  const code = couponCode.trim().toUpperCase();

  let couponQuery = Coupon.findOne({ code });

  if (session) {
    couponQuery = couponQuery.session(session);
  }

  const coupon = await couponQuery;

  if (!coupon) {
    const error = new Error("Invalid coupon code.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();

  if (!coupon.isActive) {
    const error = new Error("This coupon is currently inactive.");
    error.statusCode = 400;
    throw error;
  }

  if (now < coupon.startDate) {
    const error = new Error("This coupon is not available yet.");
    error.statusCode = 400;
    throw error;
  }

  if (now > coupon.expiryDate) {
    const error = new Error("This coupon has expired.");
    error.statusCode = 400;
    throw error;
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageCount >= coupon.usageLimit
  ) {
    const error = new Error("This coupon usage limit has been reached.");
    error.statusCode = 400;
    throw error;
  }

  if (subtotal < coupon.minimumOrderAmount) {
    const error = new Error(
      `Minimum order amount for this coupon is ${coupon.minimumOrderAmount} BDT.`
    );
    error.statusCode = 400;
    throw error;
  }

  const userUsage = coupon.usedBy.find(
    (entry) => entry.user.toString() === userId.toString()
  );

  const userUsageCount = userUsage ? userUsage.count : 0;

  if (userUsageCount >= coupon.perUserLimit) {
    const error = new Error(
      "You have already reached the usage limit for this coupon."
    );
    error.statusCode = 400;
    throw error;
  }

  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;

    if (coupon.maximumDiscountAmount !== null) {
      discount = Math.min(discount, coupon.maximumDiscountAmount);
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, subtotal);
  discount = Number(discount.toFixed(2));

  return {
    coupon,
    discount,
  };
}

module.exports = validateCoupon;