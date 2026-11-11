const express = require("express");
const router = express.Router();

const createProductController = require("../controller/product/createProductController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { uploadSingle } = require("../middleware/multer");

const getProductsController = require("../controller/product/getProductsController");
const getSingleProductController = require("../controller/product/getSingleProductController");
const manageProductController = require("../controller/product/manageProductController");

router.get("/", getProductsController);
router.get("/:slug", getSingleProductController);

router.use(authMiddleware, authorize("super_admin", "admin"));

router.post("/", uploadSingle("thumbnail"), createProductController);
router.put("/:id", uploadSingle("thumbnail"), manageProductController);
router.delete("/:id", manageProductController);

module.exports = router;
