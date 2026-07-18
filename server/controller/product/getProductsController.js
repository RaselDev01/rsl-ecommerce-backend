const Product = require("../../model/productSchema");

async function getProductsController(req, res) {
  try {
const page = Math.max(Number(req.query.page) || 1, 1);
const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {};

    const search = req.query.search || "";
    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    const category = req.query.category || "";
    if (category) {
      filter.category = category;
    }

    const subcategory = req.query.subcategory || "";
    if (subcategory) {
      filter.subcategory = subcategory;
    }

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("subcategory", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      pagination: {
        currentPage: page,
        limit,
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
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
