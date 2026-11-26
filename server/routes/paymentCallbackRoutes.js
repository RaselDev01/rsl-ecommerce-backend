const express = require("express");
const router = express.Router();

const successPaymentController = require("../controller/payment/successPaymentController");
const failPaymentController = require("../controller/payment/failPaymentController");
const cancelPaymentController = require("../controller/payment/cancelPaymentController");
const ipnPaymentController = require("../controller/payment/ipnPaymentController");

router.post("/success", successPaymentController);
router.post("/fail", failPaymentController);
router.post("/cancel", cancelPaymentController);
router.post("/ipn", ipnPaymentController);

module.exports = router;