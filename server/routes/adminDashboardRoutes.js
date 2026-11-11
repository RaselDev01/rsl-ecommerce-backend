const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  adminDashboardStatsController,
  adminLowStockProductsController,
  adminSalesOverviewController,
  adminTopSellingProductsController,
  adminTopCustomersController,
  adminOrderStatusOverviewController,
} = require("../controller/adminDashboardController");

router.use(authMiddleware, authorize("admin", "super_admin"));

router.get("/stats", adminDashboardStatsController);
router.get("/low-stock", adminLowStockProductsController);
router.get("/sales-overview", adminSalesOverviewController);
router.get("/top-selling-products", adminTopSellingProductsController);
router.get("/top-customers", adminTopCustomersController);
router.get("/order-status-overview", adminOrderStatusOverviewController);

module.exports = router;