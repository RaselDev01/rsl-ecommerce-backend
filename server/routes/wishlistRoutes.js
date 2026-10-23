const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const addToWishlistController = require("../controller/wishlist/addToWishlistController");
const getMyWishlistController = require("../controller/wishlist/getMyWishlistController");
const removeFromWishlistController = require("../controller/wishlist/removeFromWishlistController");

router.use(authMiddleware);

router.post("/add/:productId", addToWishlistController);
router.get("/me", getMyWishlistController);
router.delete("/remove/:productId", removeFromWishlistController);

module.exports = router;
