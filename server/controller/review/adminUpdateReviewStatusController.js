const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");

async function adminUpdateReviewStatusController(req, res) {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID format.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either approved or rejected.",
      });
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("user", "name email")
      .populate("product", "title slug")
      .populate("order", "orderNumber orderStatus")
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Review ${status} successfully.`,
      data: review,
    });
  } catch (error) {
    console.error("Admin Update Review Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating review status.",
    });
  }
}

module.exports = adminUpdateReviewStatusController;
