const mongoose = require("mongoose");

const Payment = require("../../model/paymentSchema");
const Order = require("../../model/orderSchema");

const querySslcommerzRefund = require("../../helpers/payment/querySslcommerzRefund");

async function adminRefundStatusController(req, res) {
  let session;

  try {
    const { paymentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      gatewayName: "sslcommerz",
      refundStatus: "processing",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Processing refund not found.",
      });
    }

    if (!payment.refundReferenceId) {
      return res.status(400).json({
        success: false,
        message: "Refund reference ID is missing.",
      });
    }

    const refundResult = await querySslcommerzRefund(
      payment.refundReferenceId
    );

    if (
      refundResult.transactionId &&
      refundResult.transactionId !== payment.transactionId
    ) {
      return res.status(400).json({
        success: false,
        message: "Refund transaction ID mismatch.",
      });
    }

    if (
      refundResult.bankTransactionId &&
      refundResult.bankTransactionId !== payment.bankTransactionId
    ) {
      return res.status(400).json({
        success: false,
        message: "Bank transaction ID mismatch.",
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const updatedPayment = await Payment.findOne({
      _id: payment._id,
      refundStatus: "processing",
    }).session(session);

    if (!updatedPayment) {
      throw new Error("Refund status changed during processing.");
    }

    if (refundResult.status === "refunded") {
      updatedPayment.refundStatus = "refunded";
      updatedPayment.refundedAt =
        refundResult.refundedAt || new Date();

      if (updatedPayment.refundAmount >= updatedPayment.amount) {
        updatedPayment.status = "refunded";
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        updatedPayment.order,
        {
          $set: {
            paymentStatus: "refunded",
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!updatedOrder) {
        throw new Error("Related order not found.");
      }
    } else if (refundResult.status === "cancelled") {
      updatedPayment.refundStatus = "failed";
    }

    await updatedPayment.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Refund status retrieved successfully.",
      data: {
        paymentId: updatedPayment._id,
        orderId: updatedPayment.order,
        transactionId: updatedPayment.transactionId,
        refundAmount: updatedPayment.refundAmount,
        refundStatus: updatedPayment.refundStatus,
        paymentStatus: updatedPayment.status,
        refundReferenceId: updatedPayment.refundReferenceId,
        refundedAt: updatedPayment.refundedAt,
      },
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Admin Refund Status Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve refund status.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = adminRefundStatusController;