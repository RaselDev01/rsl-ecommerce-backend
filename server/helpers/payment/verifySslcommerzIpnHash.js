const crypto = require("crypto");

const getSslcommerzConfig = require("../../config/sslcommerz");

function verifySslcommerzIpnHash(payload) {
  try {
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.verify_sign !== "string" ||
      typeof payload.verify_key !== "string"
    ) {
      return false;
    }

    const config = getSslcommerzConfig();

    const verifyKeys = payload.verify_key
      .split(",")
      .map((key) => key.trim());

    if (
      verifyKeys.length === 0 ||
      verifyKeys.length > 100 ||
      new Set(verifyKeys).size !== verifyKeys.length
    ) {
      return false;
    }

    const data = {};

    for (const key of verifyKeys) {
      if (
        !key ||
        key === "store_passwd" ||
        !Object.prototype.hasOwnProperty.call(payload, key) ||
        typeof payload[key] !== "string"
      ) {
        return false;
      }

      data[key] = payload[key];
    }

    data.store_passwd = crypto
      .createHash("md5")
      .update(config.storePassword)
      .digest("hex");

    const sortedKeys = Object.keys(data).sort();

    const hashString = sortedKeys
      .map((key) => `${key}=${data[key]}`)
      .join("&");

    const calculatedHash = crypto
      .createHash("md5")
      .update(hashString)
      .digest("hex");

    const receivedHash = payload.verify_sign.toLowerCase();

    if (!/^[a-f0-9]{32}$/.test(receivedHash)) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(receivedHash, "hex")
    );
  } catch (error) {
    console.error("SSLCommerz IPN hash verification error:", error.message);
    return false;
  }
}

module.exports = verifySslcommerzIpnHash;