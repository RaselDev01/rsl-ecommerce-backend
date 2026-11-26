const mongoose = require("mongoose");

const Order = require("../../model/orderSchema");
const Product = require("../../model/productSchema");
const Coupon = require("../../model/couponSchema");

async function releaseOrderReservation({ order, session }) {
  if (!order?._id || !order?.user || !session) {
    throw new Error("Invalid order reservation release parameters.");
  }

  if (order.reservationReleasedAt) {
    throw new Error("Order reservation has already been released.");
  }

  const releaseAt = new Date();

  const reservationUpdate = await Order.updateOne(
    {
      _id: order._id,
      reservationReleasedAt: null,
    },
    {
      $set: {
        reservationReleasedAt: releaseAt,
      },
    },
    { session }
  );

  if (reservationUpdate.modifiedCount !== 1) {
    const error = new Error(
      "Order reservation has already been released."
    );
    error.statusCode = 409;
    throw error;
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    const error = new Error(
      "Order items are unavailable. Stock cannot be restored."
    );
    error.statusCode = 400;
    throw error;
  }

  const productQuantities = new Map();

  for (const item of order.items) {
    if (
      !item.product ||
      !mongoose.Types.ObjectId.isValid(item.product) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      const error = new Error(
        "Invalid order item data. Stock cannot be restored."
      );
      error.statusCode = 400;
      throw error;
    }

    const productId = item.product.toString();

    productQuantities.set(
      productId,
      (productQuantities.get(productId) || 0) + item.quantity
    );
  }

  const bulkOperations = Array.from(
    productQuantities.entries()
  ).map(([productId, quantity]) => ({
    updateOne: {
      filter: {
        _id: new mongoose.Types.ObjectId(productId),
      },
      update: {
        $inc: {
          stock: quantity,
        },
      },
    },
  }));

  const stockResult = await Product.bulkWrite(
    bulkOperations,
    {
      session,
      ordered: true,
    }
  );

  if (stockResult.matchedCount !== bulkOperations.length) {
    const error = new Error(
      "One or more products could not be found. Stock restoration failed."
    );
    error.statusCode = 409;
    throw error;
  }

  if (order.coupon) {
    const releasedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: order.coupon,
        usageCount: { $gt: 0 },
        usedBy: {
          $elemMatch: {
            user: order.user,
            count: { $gt: 0 },
          },
        },
      },
      [
        {
          $set: {
            usageCount: {
              $subtract: ["$usageCount", 1],
            },
            usedBy: {
              $filter: {
                input: {
                  $map: {
                    input: "$usedBy",
                    as: "entry",
                    in: {
                      $cond: [
                        {
                          $eq: ["$$entry.user", order.user],
                        },
                        {
                          $mergeObjects: [
                            "$$entry",
                            {
                              count: {
                                $subtract: ["$$entry.count", 1],
                              },
                            },
                          ],
                        },
                        "$$entry",
                      ],
                    },
                  },
                },
                as: "entry",
                cond: {
                  $gt: ["$$entry.count", 0],
                },
              },
            },
          },
        },
      ],
      {
        new: true,
        session,
        updatePipeline: true,
      }
    );

    if (!releasedCoupon) {
      const error = new Error(
        "Coupon usage could not be released. Please check coupon usage records."
      );
      error.statusCode = 409;
      throw error;
    }
  }

  return {
    released: true,
    releasedAt: releaseAt,
  };
}

module.exports = releaseOrderReservation;