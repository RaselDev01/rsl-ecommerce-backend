const mongoose = require("mongoose");
const Order = require("../../model/orderSchema");

async function getSingleOrderController(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Invalid user session.",
      });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "A valid order ID is required.",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: userId,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "The specified order was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order retrieved successfully.",
      data: order,
    });
  } catch (error) {
    console.error("Get Single Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving the order.",
    });
  }
}

module.exports = getSingleOrderController;
