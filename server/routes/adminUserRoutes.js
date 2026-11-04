const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const getAllUsersController = require("../controller/admin/getAllUsersController");
const getSingleUserController = require("../controller/admin/getSingleUserController");

router.use(authMiddleware);
router.use(authorize("super_admin", "admin"));

router.route("/")
  .get(getAllUsersController);

router.route("/:id")
  .get(getSingleUserController);


  
module.exports = router;
