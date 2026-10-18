const mongoose = require("mongoose");
const Order = require("../../model/orderSchema");

const ALLOWED_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const STATUS_PROGRESSION = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: []
};

async function adminUpdateOrderStatusController(req, res) {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID format."
            });
        }

        if (!orderStatus || !ALLOWED_STATUSES.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status provided.",
                allowedStatuses: ALLOWED_STATUSES
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        if (order.orderStatus === orderStatus) {
            return res.status(400).json({
                success: false,
                message: `Order is already in '${orderStatus}' status.`
            });
        }

        const allowedNextStatuses = STATUS_PROGRESSION[order.orderStatus] || [];
        if (!allowedNextStatuses.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition. Cannot update order from '${order.orderStatus}' to '${orderStatus}'.`,
                validNextStatuses: allowedNextStatuses
            });
        }

        order.orderStatus = orderStatus;

        if (orderStatus === "delivered") {
            order.deliveredAt = new Date();
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully.",
            data: order
        });
    } catch (error) {
        console.error("Admin Update Order Status Error:", error);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while updating the order status."
        });
    }
}


module.exports = adminUpdateOrderStatusController;
