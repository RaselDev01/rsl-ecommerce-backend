const getSslcommerzConfig = require("../../config/sslcommerz");

async function querySslcommerzRefund(refundReferenceId) {
  if (
    typeof refundReferenceId !== "string" ||
    !refundReferenceId.trim()
  ) {
    throw new Error("Invalid refund reference ID.");
  }

  const normalizedReferenceId = refundReferenceId.trim();
  const config = getSslcommerzConfig();

  const params = new URLSearchParams({
    refund_ref_id: normalizedReferenceId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    format: "json",
  });

  const response = await fetch(
    `${config.transactionQueryUrl}?${params.toString()}`,
    {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error("SSLCommerz refund query service unavailable.");
  }

  const result = await response.json();

  if (result.APIConnect !== "DONE") {
    throw new Error(
      result.errorReason || "SSLCommerz refund query authentication failed."
    );
  }

  if (
    !["refunded", "processing", "cancelled"].includes(result.status)
  ) {
    throw new Error(
      result.errorReason || "Unable to determine refund status."
    );
  }

  if (result.refund_ref_id !== normalizedReferenceId) {
    throw new Error("Refund reference ID mismatch.");
  }

  return {
    status: result.status,
    refundReferenceId: result.refund_ref_id,
    bankTransactionId: result.bank_tran_id || null,
    transactionId: result.tran_id || null,
    initiatedAt: result.initiated_on
      ? new Date(result.initiated_on)
      : null,
    refundedAt: result.refunded_on
      ? new Date(result.refunded_on)
      : null,
  };
}

module.exports = querySslcommerzRefund;