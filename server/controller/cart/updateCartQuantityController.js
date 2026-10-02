const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");

async function updateCartQuantityController(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    const newQuantity = Number(quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const cartItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
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

    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    cartItem.quantity = newQuantity;

    cartItem.price =
      product.discountPrice > 0
        ? product.discountPrice
        : product.price;

    await cart.save();

    await cart.populate(
      "items.product",
      "title slug price discountPrice thumbnail stock status"
    );

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = updateCartQuantityController;