const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");

async function checkoutPreviewController(req, res) {
  try {
    const userId = req.user?.id;
    const { addressId } = req.body;

    if (!userId) {
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

    const address = await Address.findOne({
      _id: addressId,
      user: userId,
    }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "The specified shipping address was not found.",
      });
    }

    const cart = await Cart.findOne({ user: userId }).lean();

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Checkout failed. Your shopping cart is empty.",
      });
    }

    const productIds = cart.items
      .map((item) => item.product)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const products = await Product.find({
      _id: { $in: productIds },
      status: "active",
    })
      .select("title slug price discountPrice thumbnail stock status")
      .lean();

    const productMap = new Map(
      products.map((product) => [product._id.toString(), product])
    );

    const localizedItems = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      if (!cartItem.product) continue;

      const targetProduct = productMap.get(cartItem.product.toString());

      if (!targetProduct) {
        return res.status(400).json({
          success: false,
          message: "One or more items in your cart are no longer available.",
          productId: cartItem.product,
        });
      }

      if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity specified for ${targetProduct.title}.`,
          productId: targetProduct._id,
        });
      }

      if (targetProduct.stock <= 0 || targetProduct.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock available for ${targetProduct.title}.`,
          productId: targetProduct._id,
          availableStock: targetProduct.stock,
          requestedQuantity: cartItem.quantity,
        });
      }

      const unitPrice =
        targetProduct.discountPrice > 0 && targetProduct.discountPrice < targetProduct.price
          ? targetProduct.discountPrice
          : targetProduct.price;

      const itemSubtotal = unitPrice * cartItem.quantity;
      subtotal += itemSubtotal;

      localizedItems.push({
        product: targetProduct._id,
        title: targetProduct.title,
        slug: targetProduct.slug,
        thumbnail: targetProduct.thumbnail,
        quantity: cartItem.quantity,
        originalPrice: targetProduct.price,
        discountPrice: targetProduct.discountPrice,
        unitPrice,
        itemSubtotal,
      });
    }

    const shippingFee = 0; 
    const discount = 0;
    const total = subtotal + shippingFee - discount;

    return res.status(200).json({
      success: true,
      message: "Checkout preview generated successfully.",
      data: {
        address: {
          _id: address._id.toString(),
          fullName: address.fullName,
          phone: address.phone,
          addressLine: address.addressLine,
          road: address.road,
          area: address.area,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
        items: localizedItems,
        summary: {
          itemCount: localizedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal,
          shippingFee,
          discount,
          total,
          currency: "BDT",
        },
      },
    });

  } catch (error) {
    console.error("[CRITICAL ERROR] checkoutPreviewController failure:", error);
    
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
  }
}

module.exports = checkoutPreviewController;
