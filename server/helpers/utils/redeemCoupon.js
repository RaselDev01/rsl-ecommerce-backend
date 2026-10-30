const mongoose = require("mongoose");
const Coupon = require("../../model/couponSchema");

async function redeemCoupon({ coupon, userId, session }) {
  const now = new Date();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const userUsageCount = {
    $ifNull: [
      {
        $arrayElemAt: [
          {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ["$usedBy", []] },
                  as: "entry",
                  cond: {
                    $eq: ["$$entry.user", userObjectId],
                  },
                },
              },
              as: "entry",
              in: "$$entry.count",
            },
          },
          0,
        ],
      },
      0,
    ],
  };

  const conditions = {
    _id: coupon._id,
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    $expr: {
      $and: [
        {
          $or: [
            { $eq: ["$usageLimit", null] },
            { $lt: ["$usageCount", "$usageLimit"] },
          ],
        },
        {
          $lt: [userUsageCount, "$perUserLimit"],
        },
      ],
    },
  };

  const updatePipeline = [
    {
      $set: {
        usageCount: {
          $add: [{ $ifNull: ["$usageCount", 0] }, 1],
        },
        usedBy: {
          $let: {
            vars: {
              matchedUsers: {
                $filter: {
                  input: { $ifNull: ["$usedBy", []] },
                  as: "entry",
                  cond: {
                    $eq: ["$$entry.user", userObjectId],
                  },
                },
              },
            },
            in: {
              $cond: [
                { $gt: [{ $size: "$$matchedUsers" }, 0] },
                {
                  $map: {
                    input: { $ifNull: ["$usedBy", []] },
                    as: "entry",
                    in: {
                      $cond: [
                        {
                          $eq: ["$$entry.user", userObjectId],
                        },
                        {
                          $mergeObjects: [
                            "$$entry",
                            {
                              count: {
                                $add: [
                                  { $ifNull: ["$$entry.count", 0] },
                                  1,
                                ],
                              },
                            },
                          ],
                        },
                        "$$entry",
                      ],
                    },
                  },
                },
                {
                  $concatArrays: [
                    { $ifNull: ["$usedBy", []] },
                    [{ user: userObjectId, count: 1 }],
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ];

  const redeemedCoupon = await Coupon.findOneAndUpdate(
    conditions,
    updatePipeline,
    {
      new: true,
      session,
      updatePipeline: true,
    }
  );

  if (redeemedCoupon) {
    return redeemedCoupon;
  }

  const latestCoupon = await Coupon.findById(coupon._id).session(session);

  if (!latestCoupon) {
    const error = new Error("Coupon not found.");
    error.statusCode = 404;
    throw error;
  }

  if (
    latestCoupon.usageLimit !== null &&
    latestCoupon.usageCount >= latestCoupon.usageLimit
  ) {
    const error = new Error("This coupon usage limit has been reached.");
    error.statusCode = 400;
    throw error;
  }

  const latestUserUsage = latestCoupon.usedBy.find(
    (entry) => entry.user.toString() === userId.toString()
  );

  if (
    latestUserUsage &&
    latestUserUsage.count >= latestCoupon.perUserLimit
  ) {
    const error = new Error(
      "You have already reached the usage limit for this coupon."
    );
    error.statusCode = 400;
    throw error;
  }

  const error = new Error(
    "Unable to redeem this coupon. Please try again."
  );
  error.statusCode = 409;
  throw error;
}

module.exports = redeemCoupon;