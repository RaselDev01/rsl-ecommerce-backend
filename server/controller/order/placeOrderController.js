const mongoose = require("mongoose");
const crypto = require("crypto");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Address = require("../../model/addressSchema");
const Order = require("../../model/orderSchema");

async function placeOrderController(req, res) {
  let session;

  try {
    const userId = req.user?.id;
    const { addressId, paymentMethod, notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication.",
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

    session = await mongoose.startSession();

    let createdOrder;

    await session.withTransaction(async () => {
      const address = await Address.findOne({
        _id: addressId,
        user: userId,
      })
        .session(session)
        .lean();

      if (!address) {
        const error = new Error("Shipping address not found.");
        error.statusCode = 404;
        throw error;
      }

      const cart = await Cart.findOne({
        user: userId,
      })
        .session(session)
        .lean();

      if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        const error = new Error("Your shopping cart is empty.");
        error.statusCode = 400;
        throw error;
      }

      for (const cartItem of cart.items) {
        if (
          !cartItem.product ||
          !mongoose.Types.ObjectId.isValid(cartItem.product)
        ) {
          const error = new Error("Invalid product found in your cart.");
          error.statusCode = 400;
          throw error;
        }

        if (
          !Number.isInteger(cartItem.quantity) ||
          cartItem.quantity < 1
        ) {
          const error = new Error("Invalid product quantity in your cart.");
          error.statusCode = 400;
          throw error;
        }
      }

      const productIds = cart.items.map((item) => item.product);

      const products = await Product.find({
        _id: { $in: productIds },
        status: "active",
      })
        .select("title slug price discountPrice thumbnail stock status")
        .session(session)
        .lean();

      const productMap = new Map(
        products.map((product) => [product._id.toString(), product])
      );

      const orderItems = [];
      let subtotal = 0;
      let itemCount = 0;

      for (const cartItem of cart.items) {
        const product = productMap.get(cartItem.product.toString());

        if (!product) {
          const error = new Error(
            "One or more products in your cart are unavailable."
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          !Number.isFinite(product.price) ||
          product.price < 0 ||
          !Number.isFinite(product.stock) ||
          product.stock < 0
        ) {
          const error = new Error(
            `Invalid price or stock data for ${product.title}.`
          );
          error.statusCode = 400;
          throw error;
        }

        if (product.stock < cartItem.quantity) {
          const error = new Error(
            `Insufficient stock available for ${product.title}.`
          );
          error.statusCode = 409;
          error.availableStock = product.stock;
          error.requestedQuantity = cartItem.quantity;
          throw error;
        }

        const unitPrice =
          Number.isFinite(product.discountPrice) &&
          product.discountPrice > 0 &&
          product.discountPrice < product.price
            ? product.discountPrice
            : product.price;

        const itemSubtotal = Number(
          (unitPrice * cartItem.quantity).toFixed(2)
        );

        orderItems.push({
          product: product._id,
          title: product.title,
          slug: product.slug,
          thumbnail: product.thumbnail || "",
          quantity: cartItem.quantity,
          originalPrice: product.price,
          discountPrice: product.discountPrice || 0,
          unitPrice,
          itemSubtotal,
        });

        subtotal += itemSubtotal;
        itemCount += cartItem.quantity;
      }

      subtotal = Number(subtotal.toFixed(2));

      for (const item of orderItems) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.product,
            status: "active",
            stock: { $gte: item.quantity },
          },
          {
            $inc: {
              stock: -item.quantity,
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedProduct) {
          const error = new Error(
            `Insufficient stock or product unavailable for ${item.title}.`
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const shippingFee = 0;
      const discount = 0;
      const total = Number(
        (subtotal + shippingFee - discount).toFixed(2)
      );

      const orderNumber = `ORD-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

      const orderData = {
        orderNumber,
        user: userId,
        items: orderItems,
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
        itemCount,
        subtotal,
        shippingFee,
        discount,
        total,
        currency: "BDT",
        paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        notes: notes?.trim() || "",
      };

      const orders = await Order.create([orderData], { session });
      createdOrder = orders[0];

      const cartUpdate = await Cart.updateOne(
        {
          _id: cart._id,
          user: userId,
        },
        {
          $set: {
            items: [],
          },
        },
        {
          session,
        }
      );

      if (cartUpdate.matchedCount !== 1) {
        const error = new Error(
          "Cart changed during checkout. Please try again."
        );
        error.statusCode = 409;
        throw error;
      }
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      data: createdOrder,
    });
  } catch (error) {
    console.error("Place order error:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.availableStock !== undefined && {
          availableStock: error.availableStock,
        }),
        ...(error.requestedQuantity !== undefined && {
          requestedQuantity: error.requestedQuantity,
        }),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate order number detected. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to place your order. Please try again later.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = placeOrderController;