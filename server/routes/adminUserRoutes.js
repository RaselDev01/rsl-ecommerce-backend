const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const getAllUsersController = require("../controller/admin/getAllUsersController");
const getSingleUserController = require("../controller/admin/getSingleUserController");
const createAdminUserController = require("../controller/admin/createAdminUserController");
const updateUserRoleController = require("../controller/admin/updateUserRoleController");

router.use(authMiddleware);

router.route("/")
  .get(authorize("super_admin", "admin"), getAllUsersController)
  .post(authorize("super_admin", "admin"), createAdminUserController);

router.route("/:id")
  .get(authorize("super_admin", "admin"), getSingleUserController);

router.route("/:id/role")
  .patch(authorize("super_admin"), updateUserRoleController);

module.exports = router;
