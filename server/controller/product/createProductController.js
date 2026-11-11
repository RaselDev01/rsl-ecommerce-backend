const mongoose = require("mongoose");
const slugify = require("slugify");
const fs = require("fs/promises");

const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const SubCategory = require("../../model/subCategorySchema");

async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Uploaded File Cleanup Error:", error);
    }
  }
}

async function createProductController(req, res) {
  let productSaved = false;

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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Product thumbnail is required.",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof brand !== "string" ||
      !brand.trim() ||
      typeof sku !== "string" ||
      !sku.trim() ||
      !category ||
      !subcategory ||
      price === undefined ||
      price === "" ||
      stock === undefined ||
      stock === ""
    ) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Please provide all required product fields.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(category) ||
      !mongoose.Types.ObjectId.isValid(subcategory)
    ) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Invalid category or subcategory ID.",
      });
    }

    const productPrice = Number(price);
    const productStock = Number(stock);

    const productDiscountPrice =
      discountPrice === undefined || discountPrice === ""
        ? 0
        : Number(discountPrice);

    if (
      !Number.isFinite(productPrice) ||
      productPrice < 0 ||
      !Number.isFinite(productDiscountPrice) ||
      productDiscountPrice < 0 ||
      productDiscountPrice > productPrice ||
      !Number.isInteger(productStock) ||
      productStock < 0
    ) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          "Invalid price, discount price or stock value.",
      });
    }

    let productFeatured = false;

    if (featured !== undefined) {
      if (featured === true || featured === "true") {
        productFeatured = true;
      } else if (featured === false || featured === "false") {
        productFeatured = false;
      } else {
        await removeUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Featured must be true or false.",
        });
      }
    }

    const existingCategory = await Category.findById(category);

    if (!existingCategory) {
      await removeUploadedFile(req.file.path);

      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const existingSubCategory = await SubCategory.findOne({
      _id: subcategory,
      category,
    });

    if (!existingSubCategory) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Subcategory does not belong to the selected category.",
      });
    }

    const normalizedSku = sku.trim().toUpperCase();

    const existingSku = await Product.findOne({
      sku: normalizedSku,
    });

    if (existingSku) {
      await removeUploadedFile(req.file.path);

      return res.status(409).json({
        success: false,
        message: "SKU already exists.",
      });
    }

    const slug = slugify(title.trim(), {
      lower: true,
      strict: true,
      trim: true,
    });

    if (!slug) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Product title cannot generate a valid slug.",
      });
    }

    const existingSlug = await Product.findOne({ slug });

    if (existingSlug) {
      await removeUploadedFile(req.file.path);

      return res.status(409).json({
        success: false,
        message: "A product with the same title already exists.",
      });
    }

    let productTags = [];

    if (tags !== undefined && tags !== "") {
      if (Array.isArray(tags)) {
        productTags = tags;
      } else if (typeof tags === "string") {
        try {
          const parsedTags = JSON.parse(tags);

          productTags = Array.isArray(parsedTags)
            ? parsedTags
            : [tags];
        } catch {
          productTags = tags.split(",");
        }
      } else {
        await removeUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Invalid product tags.",
        });
      }

      if (
        !productTags.every(
          (tag) => typeof tag === "string" && tag.trim()
        )
      ) {
        await removeUploadedFile(req.file.path);

        return res.status(400).json({
          success: false,
          message: "Product tags must contain valid strings.",
        });
      }

      productTags = productTags.map((tag) => tag.trim());
    }

    const newProduct = new Product({
      title: title.trim(),
      description: description.trim(),
      price: productPrice,
      discountPrice: productDiscountPrice,
      brand: brand.trim().toLowerCase(),
      stock: productStock,
      category,
      subcategory,
      featured: productFeatured,
      sku: normalizedSku,
      tags: productTags,
      seoTitle,
      seoDescription,
      slug,
      thumbnail: `/uploads/${req.file.filename}`,
      createdBy: req.user.id,
    });

    const savedProduct = await newProduct.save();

    productSaved = true;

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Create Product Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product SKU or slug already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product data.",
        errors:
          error.name === "ValidationError"
            ? Object.values(error.errors).map(
                (item) => item.message
              )
            : undefined,
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while creating the product.",
    });
  } finally {
    if (!productSaved && req.file) {
      await removeUploadedFile(req.file.path);
    }
  }
}

module.exports = createProductController;