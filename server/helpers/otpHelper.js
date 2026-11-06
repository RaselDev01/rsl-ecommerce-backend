const crypto = require("crypto");

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp) => {
  const secret = process.env.OTP_SECRET;

  if (!secret) {
    throw new Error("OTP_SECRET is not configured");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(otp)
    .digest("hex");
};

const verifyOtp = (otp, hashedOtp) => {
  if (!otp || !hashedOtp) {
    return false;
  }

  const inputHash = hashOtp(otp);

  const inputBuffer = Buffer.from(inputHash, "hex");
  const storedBuffer = Buffer.from(hashedOtp, "hex");

  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, storedBuffer);
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};