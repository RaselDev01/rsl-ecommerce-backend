const mongoose = require("mongoose");

const Payment = require("../../model/paymentSchema");

const initiateSslcommerzRefund = require("../../helpers/payment/initiateSslcommerzRefund");

async function adminRefundController(req, res) {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    if (
      typeof reason !== "string" ||
      !reason.trim() ||
      reason.trim().length > 255
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid refund reason is required.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      gatewayName: "sslcommerz",
      status: "paid",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paid SSLCommerz payment not found.",
      });
    }

    if (!payment.bankTransactionId) {
      return res.status(400).json({
        success: false,
        message: "Bank transaction ID is unavailable.",
      });
    }

    const refundAmount =
      amount === undefined ? payment.amount : Number(amount);

    if (
      !Number.isFinite(refundAmount) ||
      Math.round(refundAmount * 100) !==
        Math.round(payment.amount * 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Only full refunds are currently supported.",
      });
    }

    const lockedPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        status: "paid",
        refundStatus: {
          $in: ["not_requested", "failed"],
        },
      },
      {
        $set: {
          refundStatus: "processing",
          refundAmount,
          refundRequestedAt: new Date(),
          refundReason: reason.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lockedPayment) {
      return res.status(409).json({
        success: false,
        message: "A refund request already exists for this payment.",
      });
    }

    const refundResult = await initiateSslcommerzRefund({
      bankTransactionId: lockedPayment.bankTransactionId,
      refundAmount,
      refundReason: reason.trim(),
      referenceId: lockedPayment.transactionId,
    });

    if (
      !["success", "processing", "failed"].includes(
        refundResult.status
      )
    ) {
      return res.status(502).json({
        success: false,
        message: "Unexpected SSLCommerz refund response.",
      });
    }

    if (
      refundResult.status !== "failed" &&
      !refundResult.refundReferenceId
    ) {
      return res.status(502).json({
        success: false,
        message: "Refund reference ID was not returned by SSLCommerz.",
      });
    }

    lockedPayment.refundTransactionId =
      refundResult.refundTransactionId;

    lockedPayment.refundReferenceId =
      refundResult.refundReferenceId || null;

    lockedPayment.refundStatus =
      refundResult.status === "failed"
        ? "failed"
        : "processing";

    await lockedPayment.save();

    return res.status(200).json({
      success: true,
      message:
        refundResult.status === "failed"
          ? "SSLCommerz could not initiate the refund."
          : "Refund request submitted. Awaiting gateway confirmation.",
      data: {
        paymentId: lockedPayment._id,
        transactionId: lockedPayment.transactionId,
        refundTransactionId: lockedPayment.refundTransactionId,
        refundReferenceId: lockedPayment.refundReferenceId,
        refundAmount: lockedPayment.refundAmount,
        refundStatus: lockedPayment.refundStatus,
        gatewayStatus: refundResult.status,
      },
    });
  } catch (error) {
    console.error("Admin Refund Error:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "Unable to confirm refund request. Check refund status before retrying.",
    });
  }
}

module.exports = adminRefundController;