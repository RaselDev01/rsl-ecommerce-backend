const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Coupon code must be at least 3 characters."],
      maxlength: [30, "Coupon code cannot exceed 30 characters."],
      match: [
        /^[A-Z0-9_-]+$/,
        "Coupon code can only contain letters, numbers, underscores and hyphens.",
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters."],
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required."],
    },

    discountValue: {
      type: Number,
      required: [true, "Discount value is required."],
      min: [0.01, "Discount value must be greater than zero."],
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative."],
    },

    maximumDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount cannot be negative."],
    },

    startDate: {
      type: Date,
      required: [true, "Coupon start date is required."],
    },

    expiryDate: {
      type: Date,
      required: [true, "Coupon expiry date is required."],
      validate: {
        validator: function (value) {
          return !this.startDate || value > this.startDate;
        },
        message: "Expiry date must be after the start date.",
      },
    },

    usageLimit: {
      type: Number,
      default: null,
      min: [1, "Usage limit must be at least 1."],
      validate: {
        validator: function (value) {
          return value === null || Number.isInteger(value);
        },
        message: "Usage limit must be a whole number.",
      },
    },

    perUserLimit: {
      type: Number,
      default: 1,
      min: [1, "Per-user limit must be at least 1."],
      validate: {
        validator: Number.isInteger,
        message: "Per-user limit must be a whole number.",
      },
    },

    usageCount: {
      type: Number,
      default: 0,
      min: [0, "Usage count cannot be negative."],
    },

    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coupon creator is required."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

couponSchema.index({ isActive: 1, startDate: 1, expiryDate: 1 });


module.exports = mongoose.model("Coupon", couponSchema);