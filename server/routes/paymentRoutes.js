const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const initiatePaymentController = require("../controller/payment/initiatePaymentController");

router.post(
  "/:orderId/initiate",
  authMiddleware,
  authorize("customer"),
  initiatePaymentController
);

module.exports = router;