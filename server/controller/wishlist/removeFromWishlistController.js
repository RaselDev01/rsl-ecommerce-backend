const mongoose = require("mongoose");
const Wishlist = require("../../model/wishlistSchema");

async function removeFromWishlistController(req, res) {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID format.",
      });
    }

    const wishlistItem = await Wishlist.findOneAndDelete({
      user: userId,
      product: productId,
    });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your wishlist.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully.",
    });
  } catch (error) {
    console.error("Remove Wishlist Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist.",
    });
  }
}

module.exports = removeFromWishlistController;