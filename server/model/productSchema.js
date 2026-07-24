const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    discountPrice: {
      type: Number,
      default: 0,
      min: [0, "Discount price cannot be negative"],
    },

brand: {
  type: String,
  required: [true, "Brand is required"],
  trim: true,
  lowercase: true,
},

    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },

    thumbnail: {
      type: String,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", ], 
      // enum e "draft" add hobe
      default: "active",
    },

    featured: {
      type: Boolean,
      default: false,
    },

    galleryImages: [
      {
        type: String,
      },
    ],

sku: {
  type: String,
  unique: true,
  required: [true, "SKU is required"],
  trim: true,
  uppercase: true,
},

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    seoTitle: {
      type: String,
      default: "",
      trim: true,
    },

    seoDescription: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Product creator is required"],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ title: "text", tags: "text" });

module.exports = mongoose.model("Product", productSchema);