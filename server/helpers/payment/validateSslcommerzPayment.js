const getSslcommerzConfig = require("../../config/sslcommerz");

async function validateSslcommerzPayment({
  validationId,
  transactionId,
  expectedAmount,
  expectedCurrency,
}) {
  if (
    !validationId ||
    !transactionId ||
    !Number.isFinite(expectedAmount) ||
    expectedAmount <= 0 ||
    !expectedCurrency
  ) {
    throw new Error("Invalid payment validation parameters.");
  }

  const config = getSslcommerzConfig();

  const params = new URLSearchParams({
    val_id: validationId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    format: "json",
  });

  const response = await fetch(
    `${config.validationUrl}?${params.toString()}`,
    {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error("SSLCommerz validation service unavailable.");
  }

  const result = await response.json();

  if (!["VALID", "VALIDATED"].includes(result.status)) {
    throw new Error("SSLCommerz transaction validation failed.");
  }

  if (
    result.tran_id !== transactionId ||
    result.val_id !== validationId
  ) {
    throw new Error("Transaction information mismatch.");
  }

  const validatedAmount = Number(result.amount);

  if (
    !Number.isFinite(validatedAmount) ||
    Math.round(validatedAmount * 100) !==
      Math.round(expectedAmount * 100)
  ) {
    throw new Error("Payment amount mismatch.");
  }

  if (
    result.currency !== expectedCurrency ||
    result.currency !== "BDT"
  ) {
    throw new Error("Payment currency mismatch.");
  }

  const riskLevel = Number(result.risk_level);

  if (
    !["0", "1", 0, 1].includes(result.risk_level) ||
    ![0, 1].includes(riskLevel)
  ) {
    throw new Error("Invalid payment risk information.");
  }

  const validatedAt = result.validated_on
    ? new Date(result.validated_on)
    : new Date();

  if (Number.isNaN(validatedAt.getTime())) {
    throw new Error("Invalid payment validation date.");
  }

  return {
    valid: true,
    status: result.status,
    transactionId: result.tran_id,
    validationId: result.val_id,
    amount: validatedAmount,
    currency: result.currency,
    bankTransactionId: result.bank_tran_id || null,
    cardType: result.card_type || null,
    riskLevel,
    riskTitle: result.risk_title || null,
    validatedAt,
  };
}

module.exports = validateSslcommerzPayment;