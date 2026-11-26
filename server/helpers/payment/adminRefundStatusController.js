const mongoose = require("mongoose");

const Payment = require("../../model/paymentSchema");
const querySslcommerzRefund = require("../../helpers/payment/querySslcommerzRefund");

async function adminRefundStatusController(req, res) {
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

    if (refundResult.status === "refunded") {
      payment.refundStatus = "refunded";
      payment.refundedAt = refundResult.refundedAt || new Date();

      if (payment.refundAmount >= payment.amount) {
        payment.status = "refunded";
      }
    } else if (refundResult.status === "cancelled") {
      payment.refundStatus = "failed";
    }

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Refund status retrieved successfully.",
      data: {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        refundAmount: payment.refundAmount,
        refundStatus: payment.refundStatus,
        paymentStatus: payment.status,
        refundReferenceId: payment.refundReferenceId,
        refundedAt: payment.refundedAt,
      },
    });
  } catch (error) {
    console.error("Admin refund status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve refund status.",
    });
  }
}

module.exports = adminRefundStatusController;