const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !/^Bearer\s+\S+$/i.test(authHeader)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured properly",
      });
    }

    const token = authHeader.split(/\s+/)[1];

    const verifiedToken = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    if (
      !verifiedToken.id ||
      (
        verifiedToken.tokenVersion !== undefined &&
        (
          !Number.isSafeInteger(verifiedToken.tokenVersion) ||
          verifiedToken.tokenVersion < 0
        )
      )
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(
      verifiedToken.id
    ).select(
      "_id email role isActive deletedAt +tokenVersion"
    );

    if (
      !user ||
      !user.isActive ||
      user.deletedAt != null
    ) {
      return res.status(401).json({
        success: false,
        message: "Account not found or deactivated",
      });
    }

    const currentTokenVersion = Number(
      user.tokenVersion ?? 0
    );

    const jwtTokenVersion = verifiedToken.tokenVersion ?? 0;

    if (
      !Number.isSafeInteger(currentTokenVersion) ||
      currentTokenVersion < 0 ||
      jwtTokenVersion !== currentTokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError" &&
        error.name !== "TokenExpiredError" &&
        error.name !== "NotBeforeError" &&
        error.name !== "CastError") {
      console.error("Authentication Middleware Error:", error);
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authMiddleware;