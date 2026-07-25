const Product = require("../../model/productSchema");

async function getSingleProductController(req, res) {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug })
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("createdBy", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

module.exports = getSingleProductController;