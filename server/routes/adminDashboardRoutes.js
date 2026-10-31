const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const {
  adminDashboardStatsController,
} = require("../controller/adminDashboardController");

router.use(authMiddleware);
router.use(authorize("admin", "super_admin"));

router.get("/stats", adminDashboardStatsController);

module.exports = router;
