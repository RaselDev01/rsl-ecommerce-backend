const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");
const User = require("../../model/userSchema");

async function adminGetReviewsController(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, rating, productId, search } = req.query;
    const filter = {};

    if (status) {
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid review status. Allowed: pending, approved, rejected.",
        });
      }
      filter.status = status;
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a whole number between 1 and 5.",
        });
      }
      filter.rating = numericRating;
    }

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Product ID format.",
        });
      }
      filter.product = productId;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id").lean();

      const userIds = matchingUsers.map((user) => user._id);

      filter.$or = [
        { title: searchRegex },
        { comment: searchRegex },
        { user: { $in: userIds } },
      ];
    }

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .populate("user", "name email")
        .populate("product", "title slug thumbnail price")
        .populate("order", "orderNumber orderStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully.",
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
    console.error("Admin Get Reviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while fetching reviews.",
    });
  }
}

module.exports = adminGetReviewsController;
