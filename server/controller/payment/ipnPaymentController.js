const mongoose = require("mongoose");

const Payment = require("../../model/paymentSchema");
const Order = require("../../model/orderSchema");

const validateSslcommerzPayment = require("../../helpers/payment/validateSslcommerzPayment");
const verifySslcommerzIpnHash = require("../../helpers/payment/verifySslcommerzIpnHash");

async function ipnPaymentController(req, res) {
  let session;

  try {
    const {
      tran_id: transactionId,
      val_id: validationId,
      status,
    } = req.body;

    if (!verifySslcommerzIpnHash(req.body)) {
      return res.status(403).json({
        success: false,
        message: "Invalid IPN hash signature.",
      });
    }

    if (
      typeof transactionId !== "string" ||
      !transactionId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid IPN transaction information.",
      });
    }

    if (!["VALID", "FAILED", "CANCELLED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported IPN status.",
      });
    }

    const payment = await Payment.findOne({
      transactionId: transactionId.trim(),
      gatewayName: "sslcommerz",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    if (payment.status === "paid" || payment.status === "refunded") {
      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            ipnReceivedAt: new Date(),
            ipnVerified: true,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: "Payment has already been verified.",
        data: {
          transactionId: payment.transactionId,
          paymentStatus: payment.status,
          refundRequired: payment.refundRequired,
        },
      });
    }

    const terminalStatuses = ["failed", "cancelled", "expired"];

    // Late VALID notification must still be verified.
    // Duplicate FAILED/CANCELLED notifications must not change existing state.
    if (
      terminalStatuses.includes(payment.status) &&
      status !== "VALID"
    ) {
      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            ipnReceivedAt: new Date(),
            ipnVerified: true,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: "Payment attempt has already been processed.",
        data: {
          transactionId: payment.transactionId,
          paymentStatus: payment.status,
        },
      });
    }

    const processableStatuses = [
      "initiated",
      "pending",
      "failed",
      "cancelled",
      "expired",
    ];

    if (!processableStatuses.includes(payment.status)) {
      return res.status(409).json({
        success: false,
        message: "Payment is not eligible for processing.",
      });
    }

    if (status === "FAILED" || status === "CANCELLED") {
      const paymentStatus =
        status === "FAILED" ? "failed" : "cancelled";

      const failureReason =
        typeof req.body.error === "string"
          ? req.body.error.substring(0, 500)
          : typeof req.body.failedreason === "string"
            ? req.body.failedreason.substring(0, 500)
            : `SSLCommerz payment ${paymentStatus}.`;

      const updateData = {
        status: paymentStatus,
        ipnReceivedAt: new Date(),
        ipnVerified: true,
        failureReason,
      };

      if (paymentStatus === "failed") {
        updateData.failedAt = new Date();
      } else {
        updateData.cancelledAt = new Date();
      }

      const updateResult = await Payment.updateOne(
        {
          _id: payment._id,
          status: { $in: ["initiated", "pending"] },
        },
        {
          $set: updateData,
        }
      );

      if (updateResult.matchedCount !== 1) {
        const latestPayment = await Payment.findById(payment._id);

        if (
          latestPayment &&
          ["paid", "refunded", "failed", "cancelled", "expired"].includes(
            latestPayment.status
          )
        ) {
          return res.status(200).json({
            success: true,
            message: "Payment attempt has already been processed.",
            data: {
              transactionId: latestPayment.transactionId,
              paymentStatus: latestPayment.status,
            },
          });
        }

        return res.status(409).json({
          success: false,
          message: "Payment status changed during processing.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Payment ${paymentStatus} successfully recorded.`,
        data: {
          transactionId: payment.transactionId,
          paymentStatus,
        },
      });
    }

    if (
      typeof validationId !== "string" ||
      !validationId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment validation ID is required.",
      });
    }

    const order = await Order.findById(payment.order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Associated order not found.",
      });
    }

    if (
      order.paymentMethod !== "online" ||
      payment.user.toString() !== order.user.toString() ||
      Math.round(payment.amount * 100) !==
        Math.round(order.total * 100) ||
      payment.currency !== order.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment and order information mismatch.",
      });
    }

    const validation = await validateSslcommerzPayment({
      validationId: validationId.trim(),
      transactionId: payment.transactionId,
      expectedAmount: payment.amount,
      expectedCurrency: payment.currency,
    });

    session = await mongoose.startSession();

    let result;

    await session.withTransaction(async () => {
      const currentPayment = await Payment.findOne({
        _id: payment._id,
        status: { $in: processableStatuses },
      }).session(session);

      if (!currentPayment) {
        const error = new Error(
          "Payment has already been processed."
        );
        error.statusCode = 409;
        throw error;
      }

      const latestOrder = await Order.findById(
        currentPayment.order
      ).session(session);

      if (!latestOrder) {
        const error = new Error("Associated order not found.");
        error.statusCode = 404;
        throw error;
      }

      const paymentUpdate = {
        validationId: validation.validationId,
        bankTransactionId: validation.bankTransactionId,
        cardType: validation.cardType,
        validatedAt: validation.validatedAt,
        ipnReceivedAt: new Date(),
        ipnVerified: true,
        failureReason: null,
        failedAt: null,
        cancelledAt: null,
        expiredAt: null,
      };

      if (validation.riskLevel === 1) {
        paymentUpdate.status = "pending";

        const updateResult = await Payment.updateOne(
          {
            _id: currentPayment._id,
            status: { $in: processableStatuses },
          },
          { $set: paymentUpdate },
          { session }
        );

        if (updateResult.matchedCount !== 1) {
          const error = new Error(
            "Payment status changed during verification."
          );
          error.statusCode = 409;
          throw error;
        }

        result = {
          paymentStatus: "pending",
          refundRequired: false,
          riskLevel: 1,
        };

        return;
      }

      const orderCanBePaid =
        latestOrder.paymentMethod === "online" &&
        latestOrder.paymentStatus === "pending" &&
        latestOrder.orderStatus !== "cancelled";

      if (orderCanBePaid) {
        const orderUpdate = await Order.updateOne(
          {
            _id: latestOrder._id,
            paymentMethod: "online",
            paymentStatus: "pending",
            orderStatus: { $ne: "cancelled" },
          },
          {
            $set: {
              paymentStatus: "paid",
              "paymentDetails.transactionId":
                currentPayment.transactionId,
              "paymentDetails.gatewayName": "sslcommerz",
              "paymentDetails.paidAt": new Date(),
            },
          },
          { session }
        );

        if (orderUpdate.matchedCount !== 1) {
          const error = new Error(
            "Order payment status changed during verification."
          );
          error.statusCode = 409;
          throw error;
        }

        paymentUpdate.refundRequired = false;
        paymentUpdate.refundReason = null;

        result = {
          paymentStatus: "paid",
          refundRequired: false,
          riskLevel: 0,
        };
      } else {
        paymentUpdate.refundRequired = true;

        paymentUpdate.refundReason =
          latestOrder.orderStatus === "cancelled"
            ? "Payment received after the order was cancelled."
            : latestOrder.paymentStatus === "paid"
              ? "Duplicate successful payment detected."
              : "Order is not eligible for payment confirmation. Refund review required.";

        result = {
          paymentStatus: "paid",
          refundRequired: true,
          riskLevel: 0,
        };
      }

      paymentUpdate.status = "paid";
      paymentUpdate.paidAt = new Date();

      const paymentUpdateResult = await Payment.updateOne(
        {
          _id: currentPayment._id,
          status: { $in: processableStatuses },
        },
        { $set: paymentUpdate },
        { session }
      );

      if (paymentUpdateResult.matchedCount !== 1) {
        const error = new Error(
          "Payment status changed during verification."
        );
        error.statusCode = 409;
        throw error;
      }
    });

    return res.status(200).json({
      success: true,
      message:
        result.riskLevel === 1
          ? "Payment verified but requires additional risk review."
          : result.refundRequired
            ? "Payment verified. Refund review is required."
            : "Payment verified successfully.",
      data: {
        transactionId: payment.transactionId,
        paymentStatus: result.paymentStatus,
        riskLevel: result.riskLevel,
        refundRequired: result.refundRequired,
      },
    });
  } catch (error) {
    console.error("SSLCommerz IPN error:", error.message);

    if (error.statusCode === 409) {
      const transactionId = req.body?.tran_id;

      if (typeof transactionId === "string") {
        const latestPayment = await Payment.findOne({
          transactionId: transactionId.trim(),
          gatewayName: "sslcommerz",
        }).catch(() => null);

        if (
          latestPayment &&
          ["paid", "refunded"].includes(latestPayment.status)
        ) {
          return res.status(200).json({
            success: true,
            message: "Payment has already been verified.",
            data: {
              transactionId: latestPayment.transactionId,
              paymentStatus: latestPayment.status,
              refundRequired: latestPayment.refundRequired,
            },
          });
        }
      }
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to verify IPN notification.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = ipnPaymentController;