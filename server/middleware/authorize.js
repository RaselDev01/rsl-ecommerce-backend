function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user?.role) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. User role not found.",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission to perform this action.",
            });
        }

        next();
    };
}

module.exports = authorize;
