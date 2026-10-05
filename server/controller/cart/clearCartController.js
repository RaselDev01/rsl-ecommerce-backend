const Cart = require("../../model/cartSchema");

async function clearCartController(req, res) {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });

  } catch (error) {
    console.error("Error in clearCartController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Failed to clear cart.",
    });
  }
}

module.exports = clearCartController;
