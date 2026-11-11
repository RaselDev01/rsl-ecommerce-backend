const mongoose = require("mongoose");
const Order = require("../../model/orderSchema");

const PAYMENT_STATUS = ["pending", "paid", "failed"];

async function adminUpdatePaymentStatusController(req, res) {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID format.",
    });
  }

  if (!PAYMENT_STATUS.includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment status provided.",
      allowedStatuses: PAYMENT_STATUS,
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

      if (order.paymentMethod === "online") {
        const error = new Error(
          "Online payment status must be managed by the payment gateway."
        );
        error.statusCode = 403;
        throw error;
      }

      if (order.paymentMethod !== "cod") {
        const error = new Error("Unsupported payment method.");
        error.statusCode = 400;
        throw error;
      }

      if (order.orderStatus !== "delivered") {
        const error = new Error(
          "COD payment status can only be updated after order delivery."
        );
        error.statusCode = 400;
        throw error;
      }

      if (order.paymentStatus === paymentStatus) {
        const error = new Error(
          `Payment is already in '${paymentStatus}' status.`
        );
        error.statusCode = 400;
        throw error;
      }

      if (order.paymentStatus !== "pending") {
        const error = new Error(
          "Only pending COD payments can be updated."
        );
        error.statusCode = 400;
        throw error;
      }

      order.paymentStatus = paymentStatus;

      await order.save({ session });

      updatedOrder = order;
    });

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Admin Update Payment Status Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "An internal server error occurred while updating the payment status.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = adminUpdatePaymentStatusController;