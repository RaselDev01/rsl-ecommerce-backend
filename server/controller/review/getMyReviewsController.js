const Review = require("../../model/reviewSchema");

async function getMyReviewsController(req, res) {
  try {
    const userId = req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [reviews, totalReviews] = await Promise.all([
      Review.find({ user: userId })
        .populate("product", "title slug thumbnail price discountPrice")
        .populate("order", "_id orderNumber orderStatus")
        .select("product order rating title comment status createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Review.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Your reviews fetched successfully.",
      data: {
        reviews,
        pagination: {
          totalReviews,
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Get My Reviews Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your reviews.",
    });
  }
}

module.exports = getMyReviewsController;
