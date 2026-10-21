const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const adminGetOrdersController = require("../controller/order/adminGetOrdersController");
const adminUpdateOrderStatusController = require("../controller/order/adminUpdateOrderStatusController");
const adminUpdatePaymentStatusController = require("../controller/order/adminUpdatePaymentStatusController");

router.use(authMiddleware);

router.get("/", authorize("admin", "super_admin"), adminGetOrdersController);

router.patch(
  "/:id/status",
  authorize("admin", "super_admin"),
  adminUpdateOrderStatusController,
);

router.patch(
  "/:id/payment-status",
  authorize("admin", "super_admin"),
  adminUpdatePaymentStatusController,
);



module.exports = router;
