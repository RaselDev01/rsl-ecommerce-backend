const mongoose = require("mongoose");

const Payment = require("../../model/paymentSchema");
const Order = require("../../model/orderSchema");

const validateSslcommerzPayment = require("../../helpers/payment/validateSslcommerzPayment");

async function successPaymentController(req, res) {
  const clientUrl = process.env.CLIENT_URL?.split(",")[0]?.trim();

  const redirectTo = (path, orderId) => {
    if (!clientUrl) return null;

    const query = orderId
      ? `?orderId=${encodeURIComponent(orderId.toString())}`
      : "";

    return res.redirect(`${clientUrl}/payment/${path}${query}`);
  };

  try {
    const {
      tran_id: transactionId,
      val_id: validationId,
    } = req.body;

    if (
      typeof transactionId !== "string" ||
      typeof validationId !== "string" ||
      !transactionId.trim() ||
      !validationId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment callback data.",
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

    if (payment.status === "paid") {
      const path = payment.refundRequired
        ? "review"
        : "success";

      const redirect = redirectTo(path, payment.order);

      if (redirect) return redirect;

      return res.status(200).json({
        success: true,
        message: payment.refundRequired
          ? "Payment received. Refund review is required."
          : "Payment has already been verified.",
      });
    }

    if (!["initiated", "pending"].includes(payment.status)) {
      return res.status(409).json({
        success: false,
        message: "Payment is not eligible for verification.",
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

    if (validation.riskLevel === 1) {
      await Payment.updateOne(
        {
          _id: payment._id,
          status: { $in: ["initiated", "pending"] },
        },
        {
          $set: {
            status: "pending",
            validationId: validation.validationId,
            bankTransactionId: validation.bankTransactionId,
            cardType: validation.cardType,
            validatedAt: validation.validatedAt,
          },
        }
      );

      const latestPayment = await Payment.findById(payment._id);

      if (latestPayment?.status === "paid") {
        const path = latestPayment.refundRequired
          ? "review"
          : "success";

        const redirect = redirectTo(path, latestPayment.order);

        if (redirect) return redirect;

        return res.status(200).json({
          success: true,
          message: "Payment has already been completed.",
        });
      }

      const redirect = redirectTo("review", order._id);

      if (redirect) return redirect;

      return res.status(200).json({
        success: true,
        message: "Payment requires additional risk verification.",
        data: {
          transactionId: payment.transactionId,
          paymentStatus: "pending",
          riskLevel: 1,
        },
      });
    }

    const session = await mongoose.startSession();

    let result;

    try {
      await session.withTransaction(async () => {
        const currentPayment = await Payment.findOne({
          _id: payment._id,
          status: { $in: ["initiated", "pending"] },
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
          status: "paid",
          validationId: validation.validationId,
          bankTransactionId: validation.bankTransactionId,
          cardType: validation.cardType,
          validatedAt: validation.validatedAt,
          paidAt: new Date(),
          failureReason: null,
        };

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

          if (orderUpdate.modifiedCount !== 1) {
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
          };
        }

        const paymentUpdateResult = await Payment.updateOne(
          {
            _id: currentPayment._id,
            status: { $in: ["initiated", "pending"] },
          },
          {
            $set: paymentUpdate,
          },
          { session }
        );

        if (paymentUpdateResult.modifiedCount !== 1) {
          const error = new Error(
            "Payment status changed during verification."
          );
          error.statusCode = 409;
          throw error;
        }
      });
    } finally {
      await session.endSession();
    }

    const redirect = redirectTo(
      result.refundRequired ? "review" : "success",
      order._id
    );

    if (redirect) return redirect;

    return res.status(200).json({
      success: true,
      message: result.refundRequired
        ? "Payment received. Refund review is required."
        : "Payment verified and completed successfully.",
      data: {
        orderId: order._id,
        transactionId: payment.transactionId,
        paymentStatus: result.paymentStatus,
        refundRequired: result.refundRequired,
      },
    });
  } catch (error) {
    console.error(
      "SSLCommerz success callback error:",
      error.message
    );

    if (error.statusCode === 409) {
      const transactionId = req.body?.tran_id;

      if (typeof transactionId === "string") {
        const latestPayment = await Payment.findOne({
          transactionId: transactionId.trim(),
          gatewayName: "sslcommerz",
        }).catch(() => null);

        if (latestPayment?.status === "paid") {
          const path = latestPayment.refundRequired
            ? "review"
            : "success";

          const redirect = redirectTo(
            path,
            latestPayment.order
          );

          if (redirect) return redirect;

          return res.status(200).json({
            success: true,
            message: "Payment has already been completed.",
          });
        }
      }
    }

    if (clientUrl) {
      const status =
        error.statusCode === 409 ? "pending" : "failed";

      return res.redirect(
        `${clientUrl}/payment/${status}`
      );
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to verify payment.",
    });
  }
}

module.exports = successPaymentController;