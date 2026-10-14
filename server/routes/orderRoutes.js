const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const placeOrderController = require("../controller/order/placeOrderController");
const getMyOrdersController = require("../controller/order/getMyOrdersController");
const getSingleOrderController = require("../controller/order/getMyOrdersController");

router.use(authMiddleware);

router.route("/")
  .post(placeOrderController)
  .get(getMyOrdersController);

router.route("/:id")
  .get(getSingleOrderController);


module.exports = router;
