const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

const baseUrl = isLive
  ? "https://securepay.sslcommerz.com"
  : "https://sandbox.sslcommerz.com";

const storeId = process.env.SSLCOMMERZ_STORE_ID;
const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;

const getSslcommerzConfig = () => {
  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz credentials are not configured.");
  }

  return {
    storeId,
    storePassword,
    isLive,
    baseUrl,
    paymentUrl: `${baseUrl}/gwprocess/v4/api.php`,
    validationUrl: `${baseUrl}/validator/api/validationserverAPI.php`,
    transactionQueryUrl: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
  };
};

module.exports = getSslcommerzConfig;