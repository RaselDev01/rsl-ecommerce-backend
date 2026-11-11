const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const createCategoryController = require("../controller/category/createCategoryController");
const getCategoryController = require("../controller/category/getCategoryController");
const updateCategoryController = require("../controller/category/updateCategoryController");
const deleteCategoryController = require("../controller/category/deleteCategoryController");

router.get("/allcategory", getCategoryController);

router.use(authMiddleware, authorize("super_admin", "admin"));

router.post("/createcategory", createCategoryController);
router.put("/updatecategory/:id", updateCategoryController);
router.delete("/deletecategory/:id", deleteCategoryController);

module.exports = router;