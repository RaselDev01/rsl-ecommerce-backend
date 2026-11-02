const jwt = require("jsonwebtoken");
const User = require("../model/userSchema");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const verifiedToken = jwt.verify(
      authHeader.split(" ")[1],
      process.env.JWT_SECRET
    );

    const user = await User.findById(verifiedToken.id).select(
      "_id email role isActive"
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account not found or deactivated",
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authMiddleware;