const mongoose = require("mongoose");
const Order = require("../../model/orderSchema");
const Product = require("../../model/productSchema");

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_PROGRESSION = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

async function adminUpdateOrderStatusController(req, res) {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID format.",
    });
  }

  if (
    typeof orderStatus !== "string" ||
    !ALLOWED_STATUSES.includes(orderStatus)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status provided.",
      allowedStatuses: ALLOWED_STATUSES,
    });
  }

  let session;

  try {
    session = await mongoose.startSession();

    let updatedOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        const error = new Error("Order not found.");
        error.statusCode = 404;
        throw error;
      }

      if (order.orderStatus === orderStatus) {
        const error = new Error(
          `Order is already in '${orderStatus}' status.`
        );
        error.statusCode = 400;
        throw error;
      }

      const allowedNextStatuses =
        STATUS_PROGRESSION[order.orderStatus] || [];

      if (!allowedNextStatuses.includes(orderStatus)) {
        const error = new Error(
          `Invalid status transition. Cannot update order from '${order.orderStatus}' to '${orderStatus}'.`
        );
        error.statusCode = 400;
        error.validNextStatuses = allowedNextStatuses;
        throw error;
      }

      if (orderStatus === "cancelled") {
        if (
          order.paymentMethod === "online" &&
          order.paymentStatus === "paid"
        ) {
          const error = new Error(
            "Paid online orders cannot be cancelled directly. Please process a refund first."
          );
          error.statusCode = 400;
          throw error;
        }

        if (!Array.isArray(order.items) || order.items.length === 0) {
          const error = new Error(
            "Order items are unavailable. Stock cannot be restored."
          );
          error.statusCode = 400;
          throw error;
        }

        const productQuantities = new Map();

        for (const item of order.items) {
          if (
            !item.product ||
            !mongoose.Types.ObjectId.isValid(item.product) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
          ) {
            const error = new Error(
              "Invalid order item data. Stock cannot be restored."
            );
            error.statusCode = 400;
            throw error;
          }

          const productId = item.product.toString();

          productQuantities.set(
            productId,
            (productQuantities.get(productId) || 0) + item.quantity
          );
        }

        const bulkOperations = Array.from(
          productQuantities.entries()
        ).map(([productId, quantity]) => ({
          updateOne: {
            filter: {
              _id: new mongoose.Types.ObjectId(productId),
            },
            update: {
              $inc: {
                stock: quantity,
              },
            },
          },
        }));

        const stockResult = await Product.bulkWrite(
          bulkOperations,
          { session }
        );

        if (stockResult.matchedCount !== bulkOperations.length) {
          const error = new Error(
            "One or more products could not be found. Stock restoration failed."
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const updateData = {
        orderStatus,
      };

      if (orderStatus === "delivered") {
        updateData.deliveredAt = new Date();
      }

      if (orderStatus === "cancelled") {
        updateData.cancelledAt = new Date();
      }

      const updateResult = await Order.updateOne(
        {
          _id: order._id,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
        },
        {
          $set: updateData,
        },
        { session }
      );

      if (updateResult.matchedCount !== 1) {
        const error = new Error(
          "Order status changed during this operation. Please try again."
        );
        error.statusCode = 409;
        throw error;
      }

      updatedOrder = await Order.findById(order._id).session(session);
    });

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Admin Update Order Status Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "An internal server error occurred while updating the order status.",
      ...(error.validNextStatuses && {
        validNextStatuses: error.validNextStatuses,
      }),
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = adminUpdateOrderStatusController;