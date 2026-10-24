const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");

async function getProductReviewsController(req, res) {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID format.",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const filter = {
      product: productId,
      status: "approved",
    };

    const [reviews, totalReviews, ratingStats] = await Promise.all([
      Review.find(filter)
        .populate("user", "name")
        .select("user product rating title comment createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),

      Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(productId),
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 },
            fiveStars: {
              $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
            },
            fourStars: {
              $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
            },
            threeStars: {
              $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
            },
            twoStars: {
              $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
            },
            oneStar: {
              $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalRatings: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    return res.status(200).json({
      success: true,
      message: "Product reviews fetched successfully.",
      data: {
        reviews,
        ratingSummary: {
          averageRating: Number(stats.averageRating.toFixed(1)),
          totalReviews: stats.totalRatings,
          ratingDistribution: {
            5: stats.fiveStars,
            4: stats.fourStars,
            3: stats.threeStars,
            2: stats.twoStars,
            1: stats.oneStar,
          },
        },
        pagination: {
          totalReviews,
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Get Product Reviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews.",
    });
  }
}

module.exports = getProductReviewsController;