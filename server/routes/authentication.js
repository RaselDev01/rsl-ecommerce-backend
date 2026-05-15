const express = require("express");
const router = express.Router();
const registerController = require("../controller/auth/registerController");
const loginController = require("../controller/auth/loginController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/profile", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});
router.get("/admin", authMiddleware, adminMiddleware, (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Welcome Admin!",
    });
});

module.exports = router;