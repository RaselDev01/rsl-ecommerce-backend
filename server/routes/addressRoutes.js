const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const addAddressController = require("../controller/address/addAddressController");

router.post(
  "/",
  authMiddleware,
  addAddressController
);

module.exports = router;