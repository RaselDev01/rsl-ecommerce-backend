const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const addToCartController = require("../controller/cart/addToCartController");
const getMyCartController = require("../controller/cart/getMyCartController");
const updateCartQuantityController = require("../controller/cart/updateCartQuantityController");
const removeCartItemController = require("../controller/cart/removeCartItemController");



router.post("/", authMiddleware, addToCartController);
router.get("/", authMiddleware, getMyCartController);
router.put("/:productId", authMiddleware, updateCartQuantityController);
router.delete("/:productId", authMiddleware, removeCartItemController);




module.exports = router;
