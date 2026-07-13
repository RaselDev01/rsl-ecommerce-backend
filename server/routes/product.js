const express = require("express");
const router = express.Router();
const createProductController = require("../controller/product/createProductController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require('../middleware/roleMiddleware');
const upload = require("../middleware/multer");
const getProductsController = require("../controller/product/getProductsController");

router.get("/", getProductsController);

router.post(
  "/",
  authMiddleware,
  authorize("super_admin", "admin"),
  upload.single("thumbnail"),
  createProductController,
);


module.exports = router;
