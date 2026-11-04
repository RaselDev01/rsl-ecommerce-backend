const User = require("../../model/userSchema");

async function getAllUsersController(req, res) {
  try {
    const { page, limit, search, role, status } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    if (search && typeof search === "string") {
      const sanitizedSearch = search.trim();
      if (sanitizedSearch) {
        const escapedSearch = sanitizedSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        filter.$or = [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
        ];
      }
    }

    if (role && typeof role === "string") {
      filter.role = role.trim();
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-password -reactivationOtp -reactivationOtpExpires -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      meta: {
        totalUsers,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalUsers / limitNumber),
        limit: limitNumber,
      },
      data: users,
    });
  } catch (error) {
    console.error(`[GetAllUsersController Error][${new Date().toISOString()}]:`, error);

    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while retrieving user directory",
    });
  }
}

module.exports = getAllUsersController;
