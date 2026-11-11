const rateLimit = require("express-rate-limit");

const createRateLimiter = (windowMs, limit, message) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

const registrationLimiter = createRateLimiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later."
);

const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again after 15 minutes."
);

const otpVerificationLimiter = createRateLimiter(
  10 * 60 * 1000,
  5,
  "Too many OTP verification attempts. Please try again later."
);

const otpResendLimiter = createRateLimiter(
  15 * 60 * 1000,
  3,
  "Too many OTP requests. Please try again later."
);

const forgotPasswordLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many password recovery requests. Please try again later."
);

const passwordResetLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many password reset attempts. Please try again later."
);

module.exports = {
  registrationLimiter,
  loginLimiter,
  otpVerificationLimiter,
  otpResendLimiter,
  forgotPasswordLimiter,
  passwordResetLimiter,
};