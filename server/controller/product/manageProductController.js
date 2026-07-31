const slugify = require("slugify");
const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const SubCategory = require("../../model/subCategorySchema");
const fs = require("fs");
const path = require("path");

async function manageProductController(req, res) {
  try {
    const { id } = req.params;

    if (req.method === "DELETE") {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.thumbnail) {
        const imagePath = path.join(
          __dirname,
          "../../",
          product.thumbnail.replace(/^\//, ""),
        );

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      await Product.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    }

    if (req.method !== "PUT" && req.method !== "PATCH") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }

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
      status,
      sku,
      tags,
      seoTitle,
      seoDescription,
    } = req.body;

    const thumbnail = req.file ? `/uploads/${req.file.filename}` : undefined;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const finalPrice =
      price !== undefined ? Number(price) : Number(product.price);

    const finalDiscount =
      discountPrice !== undefined
        ? Number(discountPrice)
        : Number(product.discountPrice);

    if (finalDiscount > finalPrice) {
      return res.status(400).json({
        success: false,
        message: "Discount price cannot be greater than price",
      });
    }

    if (category) {
      const existingCategory = await Category.findById(category);

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    if (subcategory) {
      const existingSubCategory = await SubCategory.findById(subcategory);

      if (!existingSubCategory) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
        });
      }
    }

    if (sku) {
      const existingSku = await Product.findOne({
        _id: { $ne: id },
        sku,
      });

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }
    if (title) {
      product.title = title;
      product.slug = slugify(title, { lower: true, strict: true });
    }

    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (discountPrice !== undefined) product.discountPrice = discountPrice;
    if (brand !== undefined) product.brand = brand;
    if (stock !== undefined) product.stock = stock;
    if (category) product.category = category;
    if (subcategory) product.subcategory = subcategory;
    if (featured !== undefined) product.featured = featured;
    if (status) product.status = status;
    if (sku) product.sku = sku;
    if (tags) product.tags = tags;
    if (seoTitle !== undefined) product.seoTitle = seoTitle;
    if (seoDescription !== undefined) product.seoDescription = seoDescription;

    if (thumbnail) {
      if (product.thumbnail && product.thumbnail !== thumbnail) {
        const oldImagePath = path.join(
          __dirname,
          "../../",
          product.thumbnail.replace(/^\//, ""),
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      product.thumbnail = thumbnail;
    }

    const updatedProduct = await product.save();

    await updatedProduct.populate("category", "name");
    await updatedProduct.populate("subcategory", "name");
    await updatedProduct.populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = manageProductController;
