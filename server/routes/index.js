const express = require("express");
const router = express.Router();
const auth = require("./authentication");
const category = require("./category");
const product = require("./product");
const subCategory = require("./subcategory");



router.use("/auth", auth);
router.use("/category", category);
router.use("/subcategory", subCategory);
router.use("/product", product);

module.exports = router;