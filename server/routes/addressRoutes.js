const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const addAddressController = require("../controller/address/addAddressController");
const getMyAddressesController = require("../controller/address/getMyAddressesController");
const getSingleAddressController = require("../controller/address/getSingleAddressController");
const updateAddressController = require("../controller/address/updateAddressController");
const deleteAddressController = require("../controller/address/deleteAddressController");
const setDefaultAddressController = require("../controller/address/setDefaultAddressController");

router.use(authMiddleware);

router.route("/")
  .post(addAddressController)
  .get(getMyAddressesController);

router.route("/:id")
  .get(getSingleAddressController)
  .put(updateAddressController)
  .delete(deleteAddressController);

router.patch("/:id/default", setDefaultAddressController);

module.exports = router;
