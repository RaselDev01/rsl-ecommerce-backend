const mongoose = require("mongoose");
const Order = require("../../model/orderSchema");
const Product = require("../../model/productSchema");

async function cancelOrderController(req, res) {
  let session;

  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    session = await mongoose.startSession();

    let cancelledOrder;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: id,
        user: userId,
      }).session(session);

      if (!order) {
        const error = new Error("Order not found.");
        error.statusCode = 404;
        throw error;
      }

      if (order.orderStatus === "cancelled") {
        const error = new Error("Order has already been cancelled.");
        error.statusCode = 400;
        throw error;
      }

      if (!["pending", "confirmed"].includes(order.orderStatus)) {
        const error = new Error(
          "This order cannot be cancelled at its current status."
        );
        error.statusCode = 400;
        throw error;
      }

      const stockChanges = new Map();

      for (const item of order.items) {
        const productId = item.product.toString();
        const currentQuantity = stockChanges.get(productId) || 0;

        stockChanges.set(
          productId,
          currentQuantity + item.quantity
        );
      }

      const bulkOps = [];
      
      for (const [productId, quantity] of stockChanges) {
        bulkOps.push({
          updateOne: {
            filter: { _id: productId },
            update: { $inc: { stock: quantity } }
          }
        });
      }

      if (bulkOps.length > 0) {
        const bulkResult = await Product.bulkWrite(bulkOps, { session, ordered: true });
        
        if (bulkResult.matchedCount !== stockChanges.size) {
          const error = new Error(
            "One or more products associated with this order no longer exist."
          );
          error.statusCode = 409;
          throw error;
        }
      }

      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();

      await order.save({ session, validateBeforeSave: true });

      cancelledOrder = order;
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: cancelledOrder,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to cancel order. Please try again later.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = cancelOrderController;
