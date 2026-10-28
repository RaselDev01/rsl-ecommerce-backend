const Coupon = require("../../model/couponSchema");

const adminGetCouponsController = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, discountType, isActive } = req.query;
    const filter = {};

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      filter.$or = [
        { code: searchRegex },
        { description: searchRegex },
      ];
    }

    if (discountType) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount type. Allowed: percentage, fixed.",
        });
      }
      filter.discountType = discountType;
    }

    if (isActive !== undefined) {
      if (!["true", "false"].includes(isActive)) {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }
      filter.isActive = isActive === "true";
    }

    const [coupons, totalCoupons] = await Promise.all([
      Coupon.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully.",
      data: {
        coupons,
        pagination: {
          totalCoupons,
          currentPage: page,
          totalPages: Math.ceil(totalCoupons / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Admin Get Coupons Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while fetching coupons.",
    });
  }
};

module.exports = adminGetCouponsController;
