const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminGetReviewsController = require("../controller/review/adminGetReviewsController");
const adminUpdateReviewStatusController = require("../controller/review/adminUpdateReviewStatusController");
const adminDeleteReviewController = require("../controller/review/adminDeleteReviewController");

router.use(authMiddleware, authorize("admin", "super_admin"));

router.get("/", adminGetReviewsController);
router.patch("/:reviewId/status", adminUpdateReviewStatusController);
router.delete("/:reviewId", adminDeleteReviewController);

module.exports = router;