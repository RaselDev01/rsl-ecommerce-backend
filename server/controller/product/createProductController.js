const slugify = require("slugify");
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const SubCategory = require("../../model/subCategorySchema");

async function createProductController(req, res) {
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      brand,
      stock,
      category,
      subcategory,
      featured,
      sku,
      tags,
      seoTitle,
      seoDescription,
    } = req.body;

    const productPrice = Number(price);
    const productDiscountPrice = Number(discountPrice);

    if (productDiscountPrice > productPrice) {
      return res.status(400).json({
        success: false,
        message: "Discount price cannot be greater than price",
      });
    }

    const thumbnail = req.file ? req.file.filename : null;

    if (
      !title ||
      !description ||
      !price ||
      !brand ||
      !stock ||
      !category ||
      !subcategory ||
      !sku
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existingCategory = await Category.findById(category);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const existingSubCategory = await SubCategory.findById(subcategory);

    if (!existingSubCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    const existingSku = await Product.findOne({ sku });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: "SKU already exists",
      });
    }

    const slug = slugify(title, { lower: true, strict: true });

    const existingSlug = await Product.findOne({ slug });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "A product with the same title already exists",
      });
    }

    const newProduct = new Product({
      title,
      description,
      price,
      discountPrice,
      brand,
      stock,
      category,
      subcategory,
      featured,
      sku,
      tags,
      seoTitle,
      seoDescription,
      slug,
      thumbnail: `/uploads/${thumbnail}`,
      createdBy: req.user.id,
    });

    const savedProduct = await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the product",
      error: error.message,
    });
  }
}

module.exports = createProductController;
