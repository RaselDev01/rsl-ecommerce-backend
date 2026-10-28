const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const adminCreateCouponController = require("../controller/coupon/adminCreateCouponController");
const adminGetCouponsController = require("../controller/coupon/adminGetCouponsController");
const adminGetSingleCouponController = require("../controller/coupon/adminGetSingleCouponController");
const adminUpdateCouponController = require("../controller/coupon/adminUpdateCouponController");
const adminDeleteCouponController = require("../controller/coupon/adminDeleteCouponController");

router.use(authMiddleware);
router.use(authorize("admin", "super_admin"));

router
  .route("/")
  .post(adminCreateCouponController)
  .get(adminGetCouponsController);

router
  .route("/:id")
  .get(adminGetSingleCouponController)
  .patch(adminUpdateCouponController)
  .delete(adminDeleteCouponController);

module.exports = router;
