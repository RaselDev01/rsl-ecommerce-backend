const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkoutPreviewController = require("../controller/checkout/checkoutPreviewController");

router.use(authMiddleware);

router.post("/preview", checkoutPreviewController);

module.exports = router;