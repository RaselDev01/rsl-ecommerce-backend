const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const addAddressController = require("../controller/address/addAddressController");
const getMyAddressesController = require("../controller/address/getMyAddressesController");
const getSingleAddressController = require("../controller/address/getSingleAddressController");
const updateAddressController = require("../controller/address/updateAddressController");



router.post("/", authMiddleware, addAddressController);
router.get("/", authMiddleware, getMyAddressesController);
router.get("/:id", authMiddleware, getSingleAddressController);
router.put("/:id", authMiddleware, updateAddressController);



module.exports = router;
