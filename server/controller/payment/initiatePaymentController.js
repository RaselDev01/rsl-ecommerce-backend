const crypto = require("crypto");

const Order = require("../../model/orderSchema");
const Payment = require("../../model/paymentSchema");
const User = require("../../model/userSchema");

const getSslcommerzConfig = require("../../config/sslcommerz");

async function initiatePaymentController(req, res) {
  let payment;

  try {
    const userId = req.user?.id;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    if (!orderId || !/^[a-f\d]{24}$/i.test(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.paymentMethod !== "online") {
      return res.status(400).json({
        success: false,
        message: "This order does not support online payment.",
      });
    }

    if (order.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This order is not eligible for payment.",
      });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be paid.",
      });
    }

    if (
      !Number.isFinite(order.total) ||
      order.total < 10 ||
      order.total > 500000 ||
      order.currency !== "BDT"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount or currency.",
      });
    }

    const user = await User.findById(userId).select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found.",
      });
    }

    const shipping = order.shippingAddress;

    const customerName = shipping.fullName || user.name;
    const customerEmail = shipping.email || user.email;
    const customerPhone = shipping.phone;

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer name, email and phone are required for payment.",
      });
    }

    const config = getSslcommerzConfig();

    const serverUrl = process.env.SERVER_URL?.replace(/\/+$/, "");
    const clientUrl = process.env.CLIENT_URL?.split(",")[0]?.trim();

    if (!serverUrl || !clientUrl) {
      throw new Error("Server URL or client URL is not configured.");
    }

    const transactionId = `TX${Date.now()}${crypto
      .randomBytes(6)
      .toString("hex")}`;

    payment = await Payment.create({
      order: order._id,
      user: userId,
      transactionId,
      gatewayName: "sslcommerz",
      amount: order.total,
      currency: order.currency,
      status: "initiated",
    });

    const formData = new URLSearchParams({
      store_id: config.storeId,
      store_passwd: config.storePassword,
      total_amount: order.total.toFixed(2),
      currency: order.currency,
      tran_id: transactionId,

      success_url: `${serverUrl}/api/v1/payment-callback/success`,
      fail_url: `${serverUrl}/api/v1/payment-callback/fail`,
      cancel_url: `${serverUrl}/api/v1/payment-callback/cancel`,
      ipn_url: `${serverUrl}/api/v1/payment-callback/ipn`,

      cus_name: customerName.substring(0, 50),
      cus_email: customerEmail.substring(0, 50),
      cus_add1: shipping.addressLine.substring(0, 50),
      cus_add2: shipping.area.substring(0, 50),
      cus_city: shipping.city.substring(0, 50),
      cus_state: (shipping.state || shipping.city).substring(0, 50),
      cus_postcode: shipping.postalCode.substring(0, 30),
      cus_country: shipping.country.substring(0, 50),
      cus_phone: customerPhone.substring(0, 20),

      shipping_method: "NO",
      product_name: order.items
        .map((item) => item.title)
        .join(", ")
        .substring(0, 255),
      product_category: "General",
      product_profile: "general",

      value_a: order._id.toString(),
      value_b: payment._id.toString(),
    });

    const response = await fetch(config.paymentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error("SSLCommerz session request failed.");
    }

    const gatewayResponse = await response.json();

    if (
      gatewayResponse.status !== "SUCCESS" ||
      !gatewayResponse.GatewayPageURL ||
      !gatewayResponse.sessionkey
    ) {
      throw new Error(
        gatewayResponse.failedreason || "Unable to create payment session."
      );
    }

    payment.sessionKey = gatewayResponse.sessionkey;
    payment.status = "pending";

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payment session created successfully.",
      data: {
        orderId: order._id,
        paymentId: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        paymentUrl: gatewayResponse.GatewayPageURL,
      },
    });
  } catch (error) {
    console.error("Initiate payment error:", error.message);

    if (payment) {
      await Payment.updateOne(
        {
          _id: payment._id,
          status: "initiated",
        },
        {
          $set: {
            status: "failed",
            failureReason: error.message.substring(0, 500),
            failedAt: new Date(),
          },
        }
      ).catch((updateError) => {
        console.error("Payment update error:", updateError.message);
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment. Please try again later.",
    });
  }
}

module.exports = initiatePaymentController; 