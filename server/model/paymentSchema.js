const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    sessionKey: {
      type: String,
      trim: true,
      default: undefined,
    },

    gatewayName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: "sslcommerz",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: "BDT",
    },

    status: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ],
      default: "initiated",
      required: true,
    },

    validationId: {
      type: String,
      trim: true,
      default: null,
    },

    bankTransactionId: {
      type: String,
      trim: true,
      default: null,
    },

    cardType: {
      type: String,
      trim: true,
      default: null,
    },

    validatedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    ipnReceivedAt: {
      type: Date,
      default: null,
    },

    ipnVerified: {
      type: Boolean,
      default: false,
    },

    failureReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    refundRequired: {
      type: Boolean,
      default: false,
    },

    refundReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundTransactionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    refundReferenceId: {
      type: String,
      trim: true,
      default: null,
    },

    refundStatus: {
      type: String,
      enum: [
        "not_requested",
        "processing",
        "refunded",
        "failed",
      ],
      default: "not_requested",
    },

    refundRequestedAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index(
  { sessionKey: 1 },
  {
    unique: true,
    sparse: true,
  }
);

paymentSchema.index({
  order: 1,
  createdAt: -1,
});

paymentSchema.index({
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Payment", paymentSchema);