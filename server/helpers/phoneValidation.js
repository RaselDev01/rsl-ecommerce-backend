const { parsePhoneNumberFromString } = require("libphonenumber-js");

const validatePhoneNumber = (countryCode, phone) => {
  if (
    !countryCode ||
    !phone ||
    typeof countryCode !== "string" ||
    typeof phone !== "string"
  ) {
    return null;
  }

  const normalizedCountryCode = countryCode.trim();
  const normalizedPhone = phone.replace(/\D/g, "");

  if (!/^\+\d{1,3}$/.test(normalizedCountryCode) || !normalizedPhone) {
    return null;
  }

  const phoneNumber = parsePhoneNumberFromString(
    `${normalizedCountryCode}${normalizedPhone}`
  );

  if (!phoneNumber || !phoneNumber.isValid()) {
    return null;
  }

  return phoneNumber.number;
};

module.exports = validatePhoneNumber;