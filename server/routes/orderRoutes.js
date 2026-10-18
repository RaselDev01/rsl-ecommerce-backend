const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const placeOrderController = require("../controller/order/placeOrderController");
const getMyOrdersController = require("../controller/order/getMyOrdersController");
const getSingleOrderController = require("../controller/order/getSingleOrderController");
const cancelOrderController = require("../controller/order/cancelOrderController");

router.use(authMiddleware);

router.route("/")
  .post(placeOrderController)
  .get(getMyOrdersController);

router.route("/:id")
  .get(getSingleOrderController);

router.patch("/:id/cancel", cancelOrderController);

module.exports = router;


