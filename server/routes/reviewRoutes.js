const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const createReviewController = require("../controller/review/createReviewController");
const getProductReviewsController = require("../controller/review/getProductReviewsController");
const updateMyReviewController = require("../controller/review/updateMyReviewController");
const deleteMyReviewController = require("../controller/review/deleteMyReviewController");
const getMyReviewsController = require("../controller/review/getMyReviewsController");

router.get("/product/:productId", getProductReviewsController);

router.post("/", authMiddleware, createReviewController);

router.patch("/:reviewId", authMiddleware, updateMyReviewController);

router.delete("/:reviewId", authMiddleware, deleteMyReviewController);

router.get("/me", authMiddleware, getMyReviewsController);



module.exports = router;