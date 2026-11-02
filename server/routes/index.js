const express = require("express");
const router = express.Router();
const auth = require("./authentication");
const category = require("./category");
const product = require("./product");
const subCategory = require("./subcategory");
const cartRoutes = require("./cartRoutes");
const addressRoutes = require("./addressRoutes");
const checkoutRoutes = require("./checkoutRoutes");
const orderRoutes = require("./orderRoutes");
const adminOrderRoutes = require("./adminOrderRoutes");
const wishlistRoutes = require("./wishlistRoutes");
const reviewRoutes = require("./reviewRoutes");
const adminReviewRoutes = require("./adminReviewRoutes");
const adminCouponRoutes = require("./adminCouponRoutes");

const adminDashboardRoutes = require("./adminDashboardRoutes");
const profileRoutes = require("./profileRoutes");


router.use("/auth", auth);
router.use("/category", category);
router.use("/subcategory", subCategory);
router.use("/product", product);
router.use("/wishlist", wishlistRoutes);
router.use("/cart", cartRoutes);
router.use("/address", addressRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/orders", orderRoutes);
router.use("/admin/orders", adminOrderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/admin/reviews", adminReviewRoutes);
router.use("/admin/coupons", adminCouponRoutes);

router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/profile", profileRoutes);


module.exports = router;