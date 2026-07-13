const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const authorize = require('../middleware/roleMiddleware');
const createSubCategoryController = require("../controller/subCategory/createSubCategoryController");
const getSubCategoryController = require("../controller/subCategory/getSubCategoryController");
const manageSubCategoryController = require("../controller/subCategory/manageSubCategoryController");

router.post("/createsubcategory", authMiddleware, authorize("super_admin", "admin"), createSubCategoryController);
router.get("/getsubcategory", getSubCategoryController);
router.put("/managesubcategory/:id", authMiddleware, authorize("super_admin", "admin"), manageSubCategoryController);
router.delete("/managesubcategory/:id", authMiddleware, authorize("super_admin", "admin"), manageSubCategoryController);


module.exports = router;
