const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const addToCartController = require("../controller/cart/addToCartController");
const getMyCartController = require("../controller/cart/getMyCartController");
const updateCartQuantityController = require("../controller/cart/updateCartQuantityController");
const clearCartController = require("../controller/cart/clearCartController");
const removeCartItemController = require("../controller/cart/removeCartItemController");

router.use(authMiddleware, authorize("customer"));

router.post("/", addToCartController);
router.get("/", getMyCartController);
router.put("/:productId", updateCartQuantityController);
router.delete("/clear", clearCartController);
router.delete("/:productId", removeCartItemController);

module.exports = router;