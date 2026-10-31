const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Order = require("../model/orderSchema");

const adminDashboardStatsController = async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalCustomers,
      totalOrders,
      pendingOrders,
      revenueResult,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: "active" }),
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
          },
        },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber user total currency paymentMethod paymentStatus orderStatus createdAt")
        .populate("user", "name email")
        .lean(),
    ]);

    const totalRevenue = revenueResult && revenueResult.length > 0 
      ? revenueResult[0].totalRevenue 
      : 0;

    return res.status(200).json({
      success: true,
      message: "Admin dashboard statistics fetched successfully",
      meta: {
        timestamp: new Date().toISOString(),
        currency: "BDT"
      },
      data: {
        summary: {
          totalProducts,
          activeProducts,
          totalCustomers,
          totalOrders,
          pendingOrders,
          totalRevenue,
        },
        recentOrders,
      },
    });
  } catch (error) {
    console.error(`[AdminDashboardStats Error]: ${error.message}`, error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while fetching dashboard statistics.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  adminDashboardStatsController,
};
