const mongoose = require("mongoose");
const Wishlist = require("../../model/wishlistSchema");
const Product = require("../../model/productSchema");

async function addToWishlistController(req, res) {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID format.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const wishlistItem = await Wishlist.create({
      user: userId,
      product: productId,
    });

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist successfully.",
      data: wishlistItem,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product is already in your wishlist.",
      });
    }

    console.error("Add to Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist.",
    });
  }
}

module.exports = addToWishlistController;
