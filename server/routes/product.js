const express = require("express");
const router = express.Router();
const createProductController = require("../controller/product/createProductController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/multer");

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("thumbnail"),
  createProductController,
);

module.exports = router;
