const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");

async function adminDeleteReviewController(req, res) {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID format.",
      });
    }

    const review = await Review.findByIdAndDelete(reviewId).lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully by admin.",
      data: {
        reviewId: review._id,
        productId: review.product,
        userId: review.user,
      },
    });
  } catch (error) {
    console.error("Admin Delete Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while deleting the review.",
    });
  }
}

module.exports = adminDeleteReviewController;
