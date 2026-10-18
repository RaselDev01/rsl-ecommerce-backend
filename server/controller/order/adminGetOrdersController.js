const Order = require("../../model/orderSchema");

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

async function adminGetOrdersController(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      orderStatus,
      paymentStatus,
      paymentMethod,
      orderNumber,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    const ALLOWED_ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    const ALLOWED_PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
    const ALLOWED_PAYMENT_METHODS = ["cod", "online"];

    if (orderStatus && !ALLOWED_ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: "Invalid order status." });
    }
    if (paymentStatus && !ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid payment status." });
    }
    if (paymentMethod && !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment method." });
    }

    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (orderNumber) {
      filter.orderNumber = {
        $regex: escapeRegex(orderNumber.trim()),
        $options: "i",
      };
    }

    if (startDate || endDate) {
      const createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid start date format." });
        }
        createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid end date format." });
        }
        end.setUTCHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }

      if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) {
        return res.status(400).json({ success: false, message: "Start date cannot be after end date." });
      }

      filter.createdAt = createdAt;
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
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
      filters: {
        orderStatus: orderStatus || null,
        paymentStatus: paymentStatus || null,
        paymentMethod: paymentMethod || null,
        orderNumber: orderNumber || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      data: orders,
    });

  } catch (error) {
    console.error("Admin Get Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving orders.",
    });
  }
}

module.exports = adminGetOrdersController;
