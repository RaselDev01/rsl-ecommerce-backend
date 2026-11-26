const crypto = require("crypto");

const getSslcommerzConfig = require("../../config/sslcommerz");

async function initiateSslcommerzRefund({
  bankTransactionId,
  refundAmount,
  refundReason,
  referenceId,
}) {
  if (
    typeof bankTransactionId !== "string" ||
    !bankTransactionId.trim() ||
    bankTransactionId.trim().length > 80 ||
    !Number.isFinite(refundAmount) ||
    refundAmount <= 0 ||
    typeof refundReason !== "string" ||
    !refundReason.trim() ||
    refundReason.trim().length > 255
  ) {
    throw new Error("Invalid refund parameters.");
  }

  const config = getSslcommerzConfig();

  const refundTransactionId = `RF${Date.now()}${crypto
    .randomBytes(5)
    .toString("hex")}`;

  const params = new URLSearchParams({
    bank_tran_id: bankTransactionId.trim(),
    refund_trans_id: refundTransactionId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    refund_amount: refundAmount.toFixed(2),
    refund_remarks: refundReason.trim(),
    format: "json",
  });

  if (referenceId) {
    params.set("refe_id", referenceId.toString().substring(0, 50));
  }

  const response = await fetch(
    `${config.transactionQueryUrl}?${params.toString()}`,
    {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error("SSLCommerz refund service unavailable.");
  }

  const result = await response.json();

  if (result.APIConnect !== "DONE") {
    throw new Error(
      result.errorReason || "SSLCommerz refund authentication failed."
    );
  }

  if (!["success", "processing", "failed"].includes(result.status)) {
    throw new Error("Unexpected SSLCommerz refund response.");
  }

  if (
    result.bank_tran_id &&
    result.bank_tran_id !== bankTransactionId.trim()
  ) {
    throw new Error("Refund bank transaction ID mismatch.");
  }

  return {
    refundTransactionId,
    bankTransactionId: result.bank_tran_id || bankTransactionId.trim(),
    transactionId: result.trans_id || null,
    refundReferenceId: result.refund_ref_id || null,
    status: result.status,
    errorReason: result.errorReason || null,
  };
}

module.exports = initiateSslcommerzRefund;