const express = require("express");
const router = express.Router();
const createProductController = require("../controller/product/createProductController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/multer");
const getProductsController = require("../controller/product/getProductsController");
const getSingleProductController = require("../controller/product/getSingleProductController");
const manageProductController = require("../controller/product/manageProductController");

router.post(
  "/",
  authMiddleware,
  authorize("super_admin", "admin"),
  upload.single("thumbnail"),
  createProductController,
);

router.get("/", getProductsController);
router.get("/:slug", getSingleProductController);

router.put(
  "/:id",
  authMiddleware,
  authorize("super_admin", "admin"),
  upload.single("thumbnail"),
  manageProductController,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("super_admin", "admin"),
  manageProductController,
);

module.exports = router;
