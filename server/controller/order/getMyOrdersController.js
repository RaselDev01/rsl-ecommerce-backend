const Order = require("../../model/orderSchema");
const mongoose = require("mongoose");

async function getMyOrdersController(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Invalid user session.",
      });
    }

    let page = Number(req.query.page);
    let limit = Number(req.query.limit);

    if (Number.isNaN(page) || page < 1) page = 1;
    if (Number.isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully.",
      pagination: {
        currentPage: page,
        limit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
      },
      data: orders,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders. Please try again later.",
    });
  }
}

module.exports = getMyOrdersController;
