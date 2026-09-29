const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const addToCartController = require("../controller/cart/addToCartController");
const getMyCartController = require("../controller/cart/getMyCartController");

router.post("/", authMiddleware, addToCartController);
router.get("/", authMiddleware, getMyCartController);

module.exports = router;