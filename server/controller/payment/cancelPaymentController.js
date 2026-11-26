const Payment = require("../../model/paymentSchema");

async function cancelPaymentController(req, res) {
  const clientUrl = process.env.CLIENT_URL?.split(",")[0]?.trim();

  try {
    const { tran_id: transactionId } = req.body;

    if (
      typeof transactionId !== "string" ||
      !transactionId.trim()
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
      if (clientUrl) {
        return res.redirect(
          `${clientUrl}/payment/success?orderId=${payment.order}`
        );
      }

      return res.status(200).json({
        success: true,
        message: "Payment has already been completed.",
      });
    }

    if (["failed", "cancelled", "expired"].includes(payment.status)) {
      if (clientUrl) {
        return res.redirect(
          `${clientUrl}/payment/cancelled?orderId=${payment.order}`
        );
      }

      return res.status(200).json({
        success: true,
        message: "Payment attempt has already been processed.",
      });
    }

    // Do not trust the browser callback to change payment status.
    // The verified payment notification will handle synchronization.

    if (clientUrl) {
      return res.redirect(
        `${clientUrl}/payment/cancelled?orderId=${payment.order}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment cancellation notification received.",
      data: {
        transactionId: payment.transactionId,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("SSLCommerz cancel callback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process payment cancellation callback.",
    });
  }
}

module.exports = cancelPaymentController;