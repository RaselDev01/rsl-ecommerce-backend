const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");

async function addToCartController(req, res) {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [
          {
            product: product._id,
            quantity,
            price: product.discountPrice > 0
              ? product.discountPrice
              : product.price,
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + Number(quantity);

        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: "Insufficient stock",
          });
        }

        existingItem.quantity = newQuantity;
        existingItem.price =
          product.discountPrice > 0
            ? product.discountPrice
            : product.price;
      } else {
        cart.items.push({
          product: product._id,
          quantity,
          price:
            product.discountPrice > 0
              ? product.discountPrice
              : product.price,
        });
      }
    }

    await cart.save();

    await cart.populate("items.product", "title slug price discountPrice thumbnail stock");

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = addToCartController;