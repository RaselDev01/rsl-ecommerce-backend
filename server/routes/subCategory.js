const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const createSubCategoryController = require("../controller/subCategory/createSubCategoryController");
const getSubCategoryController = require("../controller/subCategory/getSubCategoryController");
const manageSubCategoryController = require("../controller/subCategory/manageSubCategoryController");

router.post("/createsubcategory", authMiddleware, adminMiddleware, createSubCategoryController);
router.get("/getsubcategory", getSubCategoryController);
router.put("/managesubcategory/:id", authMiddleware, adminMiddleware, manageSubCategoryController);
router.delete("/managesubcategory/:id", authMiddleware, adminMiddleware, manageSubCategoryController);



module.exports = router;
