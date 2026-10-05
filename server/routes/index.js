const express = require("express");
const router = express.Router();
const auth = require("./authentication");
const category = require("./category");
const product = require("./product");
const subCategory = require("./subcategory");
const cartRoutes = require("./cartRoutes");
const addressRoutes = require("./addressRoutes");



router.use("/auth", auth);
router.use("/category", category);
router.use("/subcategory", subCategory);
router.use("/product", product);
router.use("/cart", cartRoutes);
router.use("/address", addressRoutes);



module.exports = router;