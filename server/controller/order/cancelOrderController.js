const mongoose = require("mongoose");

const Order = require("../../model/orderSchema");
const releaseOrderReservation = require("../../helpers/order/releaseOrderReservation");

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

      if (
        order.paymentMethod === "online" &&
        ["paid", "refunded"].includes(order.paymentStatus)
      ) {
        const error = new Error(
          "Paid online orders cannot be cancelled directly. Please contact support for refund assistance."
        );
        error.statusCode = 400;
        throw error;
      }

      await releaseOrderReservation({
        order,
        session,
      });

      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();

      await order.save({
        session,
        validateBeforeSave: true,
      });

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