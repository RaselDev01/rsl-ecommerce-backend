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

const LOW_STOCK_THRESHOLD = 5;

const adminLowStockProductsController = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {
      status: "active",
      stock: { $lte: LOW_STOCK_THRESHOLD },
    };

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .select("title slug sku thumbnail price stock status")
        .sort({ stock: 1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Low stock products fetched successfully",
      meta: {
        threshold: LOW_STOCK_THRESHOLD,
        totalProducts,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        limit,
      },
      data: products,
    });
  } catch (error) {
    console.error(`[AdminLowStock Error]: ${error.message}`, error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch low stock products",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

const adminSalesOverviewController = async (req, res) => {
  try {
    const { period = "daily" } = req.query;

    if (!["daily", "monthly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Period must be daily or monthly.",
      });
    }

    const now = new Date();

    const dhakaOffset = 6 * 60 * 60 * 1000;
    const dhakaNow = new Date(now.getTime() + dhakaOffset);

    let startDate;
    let dateFormat;

    if (period === "daily") {
      startDate = new Date(
        Date.UTC(
          dhakaNow.getUTCFullYear(),
          dhakaNow.getUTCMonth(),
          dhakaNow.getUTCDate() - 6
        ) - dhakaOffset
      );

      dateFormat = "%Y-%m-%d";
    } else {
      startDate = new Date(
        Date.UTC(
          dhakaNow.getUTCFullYear(),
          dhakaNow.getUTCMonth() - 11,
          1
        ) - dhakaOffset
      );

      dateFormat = "%Y-%m";
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: "$createdAt",
              timezone: "Asia/Dhaka",
            },
          },
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const summary = salesData.reduce(
      (acc, item) => {
        acc.totalRevenue += item.totalRevenue;
        acc.totalOrders += item.totalOrders;

        return acc;
      },
      {
        totalRevenue: 0,
        totalOrders: 0,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Sales overview fetched successfully.",
      meta: {
        period,
        currency: "BDT",
        startDate,
        endDate: now,
        timezone: "Asia/Dhaka",
      },
      data: {
        summary,
        sales: salesData.map((item) => ({
          date: item._id,
          revenue: item.totalRevenue,
          orders: item.totalOrders,
        })),
      },
    });
  } catch (error) {
    console.error("Admin Sales Overview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales overview.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

const adminTopSellingProductsController = async (req, res) => {
  try {
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const topProducts = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: "cancelled" },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.product",
          title: { $first: "$items.title" },
          slug: { $first: "$items.slug" },
          thumbnail: { $first: "$items.thumbnail" },
          totalSold: { $sum: "$items.quantity" },
          totalSales: { $sum: "$items.itemSubtotal" },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $sort: {
          totalSold: -1,
          totalSales: -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          title: 1,
          slug: 1,
          thumbnail: 1,
          totalSold: 1,
          totalSales: 1,
          totalOrders: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Top selling products fetched successfully.",
      meta: {
        limit,
        currency: "BDT",
      },
      data: topProducts,
    });
  } catch (error) {
    console.error("Admin Top Selling Products Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch top selling products.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

const adminTopCustomersController = async (req, res) => {
  try {
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const topCustomers = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          orderStatus: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          totalItems: { $sum: "$itemCount" },
        },
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $match: {
          "customer.role": "customer",
        },
      },
      {
        $sort: {
          totalSpent: -1,
          totalOrders: -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          name: "$customer.name",
          email: "$customer.email",
          totalOrders: 1,
          totalSpent: 1,
          totalItems: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Top customers fetched successfully.",
      meta: {
        limit,
        currency: "BDT",
      },
      data: topCustomers,
    });
  } catch (error) {
    console.error("Admin Top Customers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch top customers.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};


const adminOrderStatusOverviewController = async (req, res) => {
  try {
    const orderStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    const statusOverview = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const statusMap = Object.fromEntries(
      statusOverview.map((item) => [
        item._id,
        item.totalOrders,
      ])
    );

    const data = orderStatuses.map((status) => ({
      status,
      totalOrders: statusMap[status] || 0,
    }));

    const totalOrders = data.reduce(
      (total, item) => total + item.totalOrders,
      0
    );

    return res.status(200).json({
      success: true,
      message: "Order status overview fetched successfully.",
      data: {
        totalOrders,
        statuses: data,
      },
    });
  } catch (error) {
    console.error("Admin Order Status Overview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order status overview.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};


module.exports = {
  adminDashboardStatsController,
  adminLowStockProductsController,
  adminSalesOverviewController,
  adminTopSellingProductsController,
  adminTopCustomersController,
  adminOrderStatusOverviewController,
  
};
