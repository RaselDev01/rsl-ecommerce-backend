const express = require('express');
const router = express.Router();
const createCategoryController = require("../controller/category/createCategoryController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const getCategoryController = require('../controller/category/getCategoryController');
const updateCategoryController = require('../controller/category/updateCategoryController');
const deleteCategoryController = require('../controller/category/deleteCategoryController');

router.post("/createcategory", authMiddleware, adminMiddleware, createCategoryController);
router.get("/allcategory", getCategoryController);
router.put("/updatecategory/:id", authMiddleware, adminMiddleware, updateCategoryController);
router.delete("/deletecategory/:id",authMiddleware, adminMiddleware, deleteCategoryController);



module.exports = router;