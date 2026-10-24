const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");

async function updateMyReviewController(req, res) {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { rating, title, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID format.",
      });
    }

    if (
      rating === undefined &&
      title === undefined &&
      comment === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or you are not authorized to update it.",
      });
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (
        rating === null ||
        rating === "" ||
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a whole number between 1 and 5.",
        });
      }

      review.rating = numericRating;
    }

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Title must be a string with at most 100 characters.",
        });
      }

      review.title = title.trim();
    }

    if (comment !== undefined) {
      if (
        typeof comment !== "string" ||
        !comment.trim() ||
        comment.trim().length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Comment is required and must not exceed 2000 characters.",
        });
      }

      review.comment = comment.trim();
    }

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      data: review,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update review.",
    });
  }
}

module.exports = updateMyReviewController;