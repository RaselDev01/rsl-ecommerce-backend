const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const checkoutPreviewController = require("../controller/checkout/checkoutPreviewController");

router.use(authMiddleware, authorize("customer"));

router.post("/preview", checkoutPreviewController);

module.exports = router;