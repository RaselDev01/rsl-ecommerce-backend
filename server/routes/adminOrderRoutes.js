const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const adminGetOrdersController = require("../controller/order/adminGetOrdersController");
const adminUpdateOrderStatusController = require("../controller/order/adminUpdateOrderStatusController");
const adminUpdatePaymentStatusController = require("../controller/order/adminUpdatePaymentStatusController");

router.use(authMiddleware, authorize("admin", "super_admin"));

router.get("/", adminGetOrdersController);

router.patch("/:id/status", adminUpdateOrderStatusController);

router.patch("/:id/payment-status", adminUpdatePaymentStatusController);

module.exports = router;