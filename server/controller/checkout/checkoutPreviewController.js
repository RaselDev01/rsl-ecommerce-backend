const mongoose = require("mongoose");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Address = require("../../model/addressSchema");
const validateCoupon = require("../../helpers/utils/validateCoupon");


async function checkoutPreviewController(req, res) {
  try {
    const userId = req.user?.id;
    const { addressId, paymentMethod, notes, couponCode } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in.",
      });
    }

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: "A valid shipping address ID is required.",
      });
    }

    if (!["cod", "online"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be cod or online.",
      });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string.",
      });
    }

    if (
      couponCode !== undefined &&
      (typeof couponCode !== "string" || !couponCode.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon code.",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: userId,
    }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found.",
      });
    }

    const cart = await Cart.findOne({
      user: userId,
    }).lean();

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your shopping cart is empty.",
      });
    }

    for (const item of cart.items) {
      if (
        !item.product ||
        !mongoose.Types.ObjectId.isValid(item.product)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product found in your cart.",
        });
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid product quantity in your cart.",
          productId: item.product,
        });
      }
    }

    const productIds = cart.items.map((item) => item.product);

    const products = await Product.find({
      _id: { $in: productIds },
      status: "active",
    })
      .select("title slug price discountPrice thumbnail stock status")
      .lean();

    const productMap = new Map(
      products.map((product) => [
        product._id.toString(),
        product,
      ])
    );

    const items = [];
    let subtotal = 0;
    let itemCount = 0;

    for (const cartItem of cart.items) {
      const product = productMap.get(cartItem.product.toString());

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are unavailable.",
          productId: cartItem.product,
        });
      }

      if (
        !Number.isFinite(product.price) ||
        product.price < 0 ||
        !Number.isFinite(product.stock) ||
        product.stock < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid price or stock data for ${product.title}.`,
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(409).json({
          success: false,
          message: `Insufficient stock available for ${product.title}.`,
          productId: product._id,
          availableStock: product.stock,
          requestedQuantity: cartItem.quantity,
        });
      }

      const discountPrice = Number(product.discountPrice) || 0;

      const unitPrice =
        discountPrice > 0 && discountPrice < product.price
          ? discountPrice
          : product.price;

      const itemSubtotal = Number(
        (unitPrice * cartItem.quantity).toFixed(2)
      );

      items.push({
        product: product._id,
        title: product.title,
        slug: product.slug,
        thumbnail: product.thumbnail || "",
        quantity: cartItem.quantity,
        originalPrice: product.price,
        discountPrice,
        unitPrice,
        itemSubtotal,
      });

      subtotal += itemSubtotal;
      itemCount += cartItem.quantity;
    }

    subtotal = Number(subtotal.toFixed(2));

    const shippingFee = 0;

    let discount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const couponResult = await validateCoupon({
        couponCode,
        subtotal,
        userId,
      });

      discount = couponResult.discount;

      appliedCoupon = {
        code: couponResult.coupon.code,
        discountType: couponResult.coupon.discountType,
        discountValue: couponResult.coupon.discountValue,
        discount,
      };
    }

    const total = Number(
      (subtotal + shippingFee - discount).toFixed(2)
    );

    return res.status(200).json({
      success: true,
      message: "Checkout preview generated successfully.",
      data: {
        items,
        itemCount,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          email: address.email || "",
          addressLine: address.addressLine,
          road: address.road || "",
          area: address.area,
          city: address.city,
          state: address.state || "",
          postalCode: address.postalCode,
          country: address.country || "Bangladesh",
        },
        paymentMethod,
        notes: notes?.trim() || "",
        subtotal,
        shippingFee,
        discount,
        appliedCoupon,
        total,
        currency: "BDT",
      },
    });
  } catch (error) {
    console.error("Checkout Preview Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Unable to generate checkout preview. Please try again later.",
    });
  }
}

module.exports = checkoutPreviewController;