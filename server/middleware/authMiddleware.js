const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
        };

        const verifiedToken = jwt.verify(
            authHeader.split(" ")[1],
            process.env.JWT_SECRET,
        );

        req.user = verifiedToken;

        next();        
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
}

module.exports = authMiddleware;