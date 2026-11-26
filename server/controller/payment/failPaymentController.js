const Payment = require("../../model/paymentSchema");

async function failPaymentController(req, res) {
  const clientUrl = process.env.CLIENT_URL?.split(",")[0]?.trim();

  try {
    const { tran_id: transactionId, error: failureReason } = req.body;

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
          `${clientUrl}/payment/failed?orderId=${payment.order}`
        );
      }

      return res.status(200).json({
        success: true,
        message: "Payment attempt has already been processed.",
      });
    }

    // Browser callback is not treated as authoritative payment verification.
    // The IPN handler will verify and update the payment status.

    if (clientUrl) {
      return res.redirect(
        `${clientUrl}/payment/failed?orderId=${payment.order}`
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment failure notification received.",
      data: {
        transactionId: payment.transactionId,
        status: payment.status,
        failureReason: failureReason || null,
      },
    });
  } catch (error) {
    console.error("SSLCommerz fail callback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process payment failure callback.",
    });
  }
}

module.exports = failPaymentController;