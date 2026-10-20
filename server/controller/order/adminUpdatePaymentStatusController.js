const mongoose = require("mongoose");
const Order = require("../../model/orderSchema");

const PAYMENT_STATUS = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded"
};

const ALLOWED_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

function validatePaymentStatusTransition(order, newStatus) {
    if (order.paymentStatus === newStatus) {
        return `Payment is already in '${newStatus}' status.`;
    }

    if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
        return "A refunded payment cannot be updated.";
    }

    if (
        newStatus === PAYMENT_STATUS.REFUNDED &&
        order.paymentStatus !== PAYMENT_STATUS.PAID
    ) {
        return "Only paid orders can be marked as refunded.";
    }

    if (
        order.paymentMethod === "online" &&
        newStatus === PAYMENT_STATUS.PAID
    ) {
        return "Online payments must be verified by the payment gateway before marking them as paid.";
    }

    if (
        order.paymentStatus === PAYMENT_STATUS.PAID &&
        newStatus !== PAYMENT_STATUS.REFUNDED
    ) {
        return "A paid payment can only be changed to refunded.";
    }

    if (
        order.paymentMethod === "cod" &&
        newStatus === PAYMENT_STATUS.PAID &&
        order.orderStatus !== "delivered"
    ) {
        return "COD payment can only be marked as paid after order delivery.";
    }

    if (
        newStatus === PAYMENT_STATUS.REFUNDED &&
        order.paymentMethod === "cod"
    ) {
        return "COD payments cannot be marked as refunded through this endpoint.";
    }

    if (
        order.orderStatus === "cancelled" &&
        newStatus !== PAYMENT_STATUS.REFUNDED &&
        newStatus !== PAYMENT_STATUS.FAILED
    ) {
        return "Cancelled orders cannot be marked as paid or pending.";
    }

    return null;
}

async function adminUpdatePaymentStatusController(req, res) {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order ID format."
        });
    }

    if (!ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment status provided.",
            allowedStatuses: ALLOWED_PAYMENT_STATUSES
        });
    }

    const session = await mongoose.startSession();

    try {
        const result = await session.withTransaction(async () => {
            const order = await Order.findById(id).session(session);

            if (!order) {
                return {
                    error: "Order not found.",
                    statusCode: 404
                };
            }

            const validationError = validatePaymentStatusTransition(
                order,
                paymentStatus
            );

            if (validationError) {
                return {
                    error: validationError,
                    statusCode: 400
                };
            }

            order.paymentStatus = paymentStatus;

            await order.save({ session });

            return {
                order
            };
        });

        if (result.error) {
            return res.status(result.statusCode).json({
                success: false,
                message: result.error
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully.",
            data: result.order
        });
    } catch (error) {
        console.error("Admin Update Payment Status Error:", error);

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while updating the payment status."
        });
    } finally {
        await session.endSession();
    }
}

module.exports = adminUpdatePaymentStatusController;