const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      maxlength: [254, "Email cannot exceed 254 characters"],
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    profileImage: {
      type: String,
      default: "",
    },

    preferredVerificationMethod: {
      type: String,
      enum: ["email", "sms", null],
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    verificationOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    verificationOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },

    verificationOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    verificationOtpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    reactivationOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    reactivationOtpExpires: {
      type: Date,
      default: null,
      select: false,
    },

    reactivationOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
    
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager", "staff", "customer"],
      default: "customer",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  }
);

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("User", userSchema);