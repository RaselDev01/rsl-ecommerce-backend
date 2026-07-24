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

    const brand = req.query.brand || "";
    if (brand) {
      filter.brand = {
        $regex: brand,
        $options: "i",
      };
    }

    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);

    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      filter.price = {};

      if (!isNaN(minPrice)) {
        filter.price.$gte = minPrice;
      }

      if (!isNaN(maxPrice)) {
        filter.price.$lte = maxPrice;
      }
    }

    const sort = req.query.sort || "newest";
    let sortOption = {};
    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "priceLow") {
      sortOption = { price: 1 };
    } else if (sort === "priceHigh") {
      sortOption = { price: -1 };
    } else if (sort === "nameAZ") {
      sortOption = { title: 1 };
    } else if (sort === "nameZA") {
      sortOption = { title: -1 };
    }

    const featured = req.query.featured;
    if (featured === "true") {
  filter.featured = true;
} else if (featured === "false") {
  filter.featured = false;
}


    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("subcategory", "name")
      .sort(sortOption)
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
