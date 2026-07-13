const express = require('express');
const router = express.Router();
const createCategoryController = require("../controller/category/createCategoryController");
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const getCategoryController = require('../controller/category/getCategoryController');
const updateCategoryController = require('../controller/category/updateCategoryController');
const deleteCategoryController = require('../controller/category/deleteCategoryController');

router.post("/createcategory", authMiddleware, authorize('super_admin', 'admin'), createCategoryController);
router.get("/allcategory", getCategoryController);
router.put("/updatecategory/:id", authMiddleware, authorize('super_admin', 'admin'), updateCategoryController);
router.delete("/deletecategory/:id",authMiddleware, authorize('super_admin', 'admin'), deleteCategoryController);



module.exports = router;