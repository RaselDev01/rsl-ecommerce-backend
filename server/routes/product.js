const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Product Route Working");
});

module.exports = router;