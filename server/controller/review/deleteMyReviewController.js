const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");

async function deleteMyReviewController(req, res) {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID format.",
      });
    }

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found or you are not authorized to delete it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete review.",
    });
  }
}

module.exports = deleteMyReviewController;