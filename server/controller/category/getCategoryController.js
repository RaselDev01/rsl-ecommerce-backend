const Category = require("../../model/categorySchema");

async function getCategoryController(req, res) {
  try {
    
    const categories = await Category.find();

    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

module.exports = getCategoryController;
