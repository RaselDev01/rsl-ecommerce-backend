const mongoose = require("mongoose");
const Review = require("../../model/reviewSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");

async function createReviewController(req, res) {
  try {
    const { productId, orderId, rating, title, comment } = req.body;
    const userId = req.user.id;

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(orderId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID or order ID.",
      });
    }

    const numericRating = Number(rating);

    if (
      rating === undefined ||
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

    if (typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required.",
      });
    }

    if (comment.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 2000 characters.",
      });
    }

    if (title !== undefined && typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "Review title must be a string.",
      });
    }

    if (title && title.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title cannot exceed 100 characters.",
      });
    }

    const product = await Product.findById(productId);

    if (!product || product.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Active product not found.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or does not belong to you.",
      });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "You can review products only after order delivery.",
      });
    }

    const orderContainsProduct = order.items?.some(
      (item) => item.product?.toString() === productId
    );

    if (!orderContainsProduct) {
      return res.status(400).json({
        success: false,
        message: "This product does not belong to the specified order.",
      });
    }

    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product.",
      });
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      order: orderId,
      rating: numericRating,
      title: title?.trim(),
      comment: comment.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Product review submitted successfully.",
      data: review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit product review.",
    });
  }
}

module.exports = createReviewController;