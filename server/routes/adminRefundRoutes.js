const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminRefundController = require("../controller/payment/adminRefundController");
const adminRefundStatusController = require("../controller/payment/adminRefundStatusController");

router.use(authMiddleware, authorize("super_admin", "admin"));

router.post("/:paymentId/refund", adminRefundController);

router.get("/:paymentId/refund/status", adminRefundStatusController);

module.exports = router;