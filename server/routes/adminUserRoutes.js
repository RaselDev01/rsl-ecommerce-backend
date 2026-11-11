const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const getAllUsersController = require("../controller/admin/getAllUsersController");
const getSingleUserController = require("../controller/admin/getSingleUserController");
const createAdminUserController = require("../controller/admin/createAdminUserController");
const updateUserRoleController = require("../controller/admin/updateUserRoleController");
const manageUserStatusController = require("../controller/admin/manageUserStatusController");
const deleteUserController = require("../controller/admin/deleteUserController");

router.use(authMiddleware, authorize("admin", "super_admin"));

router.route("/")
  .get(getAllUsersController)
  .post(createAdminUserController);

router.route("/:id")
  .get(getSingleUserController)
  .delete(deleteUserController);

router.patch("/:id/role", authorize("super_admin"), updateUserRoleController);

router.patch("/:id/status", manageUserStatusController);

module.exports = router;