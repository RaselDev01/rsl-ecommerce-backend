const mongoose = require("mongoose");
const Wishlist = require("../../model/wishlistSchema");

async function getMyWishlistController(req, res) {
  try {
    const userId = req.user.id;

    const wishlist = await Wishlist.aggregate([
      { 
        $match: { user: new mongoose.Types.ObjectId(userId) } 
      },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { 
        $unwind: "$product" 
      },
      { 
        $match: { "product.status": "active" } 
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          _id: 1,
          user: 1,
          createdAt: 1,
          updatedAt: 1,
          "product._id": 1,
          "product.title": 1,
          "product.slug": 1,
          "product.price": 1,
          "product.discountPrice": 1,
          "product.thumbnail": 1,
          "product.brand": 1,
          "product.stock": 1,
          "product.status": 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully.",
      totalItems: wishlist.length,
      data: wishlist,
    });
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist.",
    });
  }
}

module.exports = getMyWishlistController;
