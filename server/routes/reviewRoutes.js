const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const createReviewController = require("../controller/review/createReviewController");
const getProductReviewsController = require("../controller/review/getProductReviewsController");
const updateMyReviewController = require("../controller/review/updateMyReviewController");
const deleteMyReviewController = require("../controller/review/deleteMyReviewController");
const getMyReviewsController = require("../controller/review/getMyReviewsController");

router.get("/product/:productId", getProductReviewsController);

router.use(authMiddleware, authorize("customer"));

router.post("/", createReviewController);
router.patch("/:reviewId", updateMyReviewController);
router.delete("/:reviewId", deleteMyReviewController);
router.get("/me", getMyReviewsController);

module.exports = router;