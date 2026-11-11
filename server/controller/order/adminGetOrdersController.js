const Order = require("../../model/orderSchema");

const ALLOWED_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ALLOWED_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

const ALLOWED_PAYMENT_METHODS = ["cod", "online"];

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function parseDateOnly(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

async function adminGetOrdersController(req, res) {
  try {
    const {
      page: pageQuery,
      limit: limitQuery,
      orderStatus,
      paymentStatus,
      paymentMethod,
      orderNumber,
      startDate,
      endDate,
    } = req.query;

    if (
      (pageQuery !== undefined &&
        (typeof pageQuery !== "string" || !/^\d+$/.test(pageQuery))) ||
      (limitQuery !== undefined &&
        (typeof limitQuery !== "string" || !/^\d+$/.test(limitQuery)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    const page = Number(pageQuery || 1);
    const limit = Number(limitQuery || 10);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 50.",
      });
    }

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination range.",
      });
    }

    const filters = [
      ["orderStatus", orderStatus, ALLOWED_ORDER_STATUSES],
      ["paymentStatus", paymentStatus, ALLOWED_PAYMENT_STATUSES],
      ["paymentMethod", paymentMethod, ALLOWED_PAYMENT_METHODS],
    ];

    for (const [field, value, allowedValues] of filters) {
      if (
        value !== undefined &&
        (
          typeof value !== "string" ||
          !allowedValues.includes(value)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field}.`,
        });
      }
    }

    if (
      orderNumber !== undefined &&
      (
        typeof orderNumber !== "string" ||
        !orderNumber.trim() ||
        orderNumber.trim().length > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order number.",
      });
    }

    if (
      (startDate !== undefined && typeof startDate !== "string") ||
      (endDate !== undefined && typeof endDate !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date parameters.",
      });
    }

    const filter = {};

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
        const start = parseDateOnly(startDate);

        if (!start) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date. Use YYYY-MM-DD format.",
          });
        }

        createdAt.$gte = start;
      }

      if (endDate) {
        const end = parseDateOnly(endDate);

        if (!end) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date. Use YYYY-MM-DD format.",
          });
        }

        end.setUTCHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }

      if (
        createdAt.$gte &&
        createdAt.$lte &&
        createdAt.$gte > createdAt.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date.",
        });
      }

      filter.createdAt = createdAt;
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email")
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
        orderNumber: orderNumber?.trim() || null,
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