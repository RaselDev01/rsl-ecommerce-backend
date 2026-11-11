const express = require("express");
const router = express.Router();

const registerController = require("../controller/auth/registerController");
const loginController = require("../controller/auth/loginController");
const verifyRegistrationOtpController = require("../controller/auth/verifyRegistrationOtpController");
const resendRegistrationOtpController = require("../controller/auth/resendRegistrationOtpController");
const sendReactivationOtpController = require("../controller/auth/sendReactivationOtpController");
const verifyReactivationOtpController = require("../controller/auth/verifyReactivationOtpController");

const forgotPasswordController = require("../controller/auth/forgotPasswordController");
const verifyPasswordResetOtpController = require("../controller/auth/verifyPasswordResetOtpController");
const resetPasswordController = require("../controller/auth/resetPasswordController");

const authMiddleware = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  registrationLimiter,
  loginLimiter,
  otpVerificationLimiter,
  otpResendLimiter,
  forgotPasswordLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiters");

router.post("/register", registrationLimiter, registerController);

router.post(
  "/verify-registration-otp",
  otpVerificationLimiter,
  verifyRegistrationOtpController
);

router.post(
  "/resend-registration-otp",
  otpResendLimiter,
  resendRegistrationOtpController
);

router.post("/login", loginLimiter, loginController);

router.post(
  "/reactivation/send-otp",
  otpResendLimiter,
  sendReactivationOtpController
);

router.post(
  "/reactivation/verify-otp",
  otpVerificationLimiter,
  verifyReactivationOtpController
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordController
);

router.post(
  "/verify-reset-otp",
  otpVerificationLimiter,
  verifyPasswordResetOtpController
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  resetPasswordController
);

router.get("/profile", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

router.get(
  "/admin",
  authMiddleware,
  authorize("super_admin", "admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome Admin!",
    });
  }
);

router.get(
  "/super-admin",
  authMiddleware,
  authorize("super_admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome Super Admin!",
    });
  }
);

module.exports = router;