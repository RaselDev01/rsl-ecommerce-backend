const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const addToWishlistController = require("../controller/wishlist/addToWishlistController");
const getMyWishlistController = require("../controller/wishlist/getMyWishlistController");
const removeFromWishlistController = require("../controller/wishlist/removeFromWishlistController");

router.use(authMiddleware, authorize("customer"));

router.post("/add/:productId", addToWishlistController);
router.get("/me", getMyWishlistController);
router.delete("/remove/:productId", removeFromWishlistController);

module.exports = router;