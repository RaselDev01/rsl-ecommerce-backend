const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multer");

const {
  getMyProfileController,
  updateMyProfileController,
  changeMyPasswordController,
  deleteMyAccountController,
} = require("../controller/profileController");

router.use(authMiddleware);

router.route("/me")
  .get(getMyProfileController)
  .patch(upload.single("profileImage"), updateMyProfileController)
  .delete(deleteMyAccountController);
  
router.patch("/change-password", changeMyPasswordController);


module.exports = router;
