const Product = require("../../model/productSchema");

async function getProductsController(req, res) {
  try {
    // const { page = 1, limit = 10 } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || "";    
    const filter = {};

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("subcategory", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      totalProducts: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

module.exports = getProductsController;
