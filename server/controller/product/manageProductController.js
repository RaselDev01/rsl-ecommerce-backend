const mongoose = require("mongoose");
const slugify = require("slugify");
const fs = require("fs/promises");
const path = require("path");

const Product = require("../../model/productSchema");
const Category = require("../../model/categorySchema");
const SubCategory = require("../../model/subCategorySchema");

const uploadDirectory = path.join(process.cwd(), "uploads");

async function removeFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("File Cleanup Error:", error);
    }
  }
}

function getProductImagePath(imageUrl) {
  if (
    typeof imageUrl !== "string" ||
    !imageUrl.startsWith("/uploads/")
  ) {
    return null;
  }

  const filename = path.basename(imageUrl);
  const imagePath = path.resolve(uploadDirectory, filename);

  if (path.dirname(imagePath) !== path.resolve(uploadDirectory)) {
    return null;
  }

  return imagePath;
}

function parseBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  return null;
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return value.split(",");
  }

  return null;
}

async function manageProductController(req, res) {
  let newImageSaved = false;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (req.method === "DELETE") {
      const deletedProduct = await Product.findByIdAndDelete(id);

      if (!deletedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const oldImagePath = getProductImagePath(
        deletedProduct.thumbnail
      );

      if (oldImagePath) {
        await removeFile(oldImagePath);
      }

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully.",
      });
    }

    if (req.method !== "PUT" && req.method !== "PATCH") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed.",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
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

    const finalPrice =
      price !== undefined ? Number(price) : product.price;

    const finalDiscount =
      discountPrice !== undefined
        ? Number(discountPrice)
        : product.discountPrice;

    const finalStock =
      stock !== undefined ? Number(stock) : product.stock;

    if (
      (price !== undefined &&
        (price === "" || !Number.isFinite(finalPrice) || finalPrice < 0)) ||
      (discountPrice !== undefined &&
        (discountPrice === "" ||
          !Number.isFinite(finalDiscount) ||
          finalDiscount < 0)) ||
      (stock !== undefined &&
        (stock === "" ||
          !Number.isInteger(finalStock) ||
          finalStock < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid price, discount price or stock value.",
      });
    }

    if (finalDiscount > finalPrice) {
      return res.status(400).json({
        success: false,
        message: "Discount price cannot be greater than price.",
      });
    }

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product title cannot be empty.",
        });
      }

      const newSlug = slugify(title.trim(), {
        lower: true,
        strict: true,
        trim: true,
      });

      if (!newSlug) {
        return res.status(400).json({
          success: false,
          message: "Product title cannot generate a valid slug.",
        });
      }

      const existingSlug = await Product.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingSlug) {
        return res.status(409).json({
          success: false,
          message: "A product with the same title already exists.",
        });
      }

      product.title = title.trim();
      product.slug = newSlug;
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Product description cannot be empty.",
        });
      }

      product.description = description.trim();
    }

    if (brand !== undefined) {
      if (typeof brand !== "string" || !brand.trim()) {
        return res.status(400).json({
          success: false,
          message: "Brand cannot be empty.",
        });
      }

      product.brand = brand.trim().toLowerCase();
    }

    if (sku !== undefined) {
      if (typeof sku !== "string" || !sku.trim()) {
        return res.status(400).json({
          success: false,
          message: "SKU cannot be empty.",
        });
      }

      const normalizedSku = sku.trim().toUpperCase();

      const existingSku = await Product.findOne({
        sku: normalizedSku,
        _id: { $ne: id },
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists.",
        });
      }

      product.sku = normalizedSku;
    }

    const finalCategory =
      category !== undefined ? category : product.category.toString();

    const finalSubCategory =
      subcategory !== undefined
        ? subcategory
        : product.subcategory.toString();

    if (
      (category !== undefined &&
        !mongoose.Types.ObjectId.isValid(category)) ||
      (subcategory !== undefined &&
        !mongoose.Types.ObjectId.isValid(subcategory))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category or subcategory ID.",
      });
    }

    if (category !== undefined || subcategory !== undefined) {
      const [existingCategory, existingSubCategory] =
        await Promise.all([
          Category.findById(finalCategory),
          SubCategory.findOne({
            _id: finalSubCategory,
            category: finalCategory,
          }),
        ]);

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }

      if (!existingSubCategory) {
        return res.status(400).json({
          success: false,
          message:
            "Subcategory does not belong to the selected category.",
        });
      }

      product.category = finalCategory;
      product.subcategory = finalSubCategory;
    }

    if (featured !== undefined) {
      const parsedFeatured = parseBoolean(featured);

      if (parsedFeatured === null) {
        return res.status(400).json({
          success: false,
          message: "Featured must be true or false.",
        });
      }

      product.featured = parsedFeatured;
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status.",
        });
      }

      product.status = status;
    }

    if (price !== undefined) product.price = finalPrice;

    if (discountPrice !== undefined) {
      product.discountPrice = finalDiscount;
    }

    if (stock !== undefined) product.stock = finalStock;

    if (tags !== undefined) {
      const parsedTags = parseTags(tags);

      if (
        !parsedTags ||
        !parsedTags.every(
          (tag) => typeof tag === "string" && tag.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product tags.",
        });
      }

      product.tags = parsedTags.map((tag) => tag.trim());
    }

    if (seoTitle !== undefined) {
      if (typeof seoTitle !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid SEO title.",
        });
      }

      product.seoTitle = seoTitle.trim();
    }

    if (seoDescription !== undefined) {
      if (typeof seoDescription !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid SEO description.",
        });
      }

      product.seoDescription = seoDescription.trim();
    }

    const oldImagePath = req.file
      ? getProductImagePath(product.thumbnail)
      : null;

    if (req.file) {
      product.thumbnail = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await product.save();

    newImageSaved = Boolean(req.file);

    if (oldImagePath) {
      await removeFile(oldImagePath);
    }

    await updatedProduct.populate("category", "name");
    await updatedProduct.populate("subcategory", "name");
    await updatedProduct.populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Manage Product Error:", error);

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
      });
    }

    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while managing the product.",
    });
  } finally {
    if (!newImageSaved && req.file) {
      await removeFile(req.file.path);
    }
  }
}

module.exports = manageProductController;