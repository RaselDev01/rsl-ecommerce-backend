const express = require("express");
const router = express.Router();
const auth = require("./authentication");
const category = require("./category");

router.use("/auth", auth);
router.use("/category", category);

module.exports = router;