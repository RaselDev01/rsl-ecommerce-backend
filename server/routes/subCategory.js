const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const createSubCategoryController = require("../controller/subCategory/createSubCategoryController");
const getSubCategoryController = require("../controller/subCategory/getSubCategoryController");
const manageSubCategoryController = require("../controller/subCategory/manageSubCategoryController");

router.get("/getsubcategory", getSubCategoryController);

router.use(authMiddleware, authorize("super_admin", "admin"));

router.post("/createsubcategory", createSubCategoryController);
router.put("/managesubcategory/:id", manageSubCategoryController);
router.delete("/managesubcategory/:id", manageSubCategoryController);

module.exports = router;