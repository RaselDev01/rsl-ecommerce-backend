const twilio = require("twilio");

const sendSms = async (to, message) => {
  try {
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
    } = process.env;

    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_AUTH_TOKEN ||
      !TWILIO_PHONE_NUMBER
    ) {
      throw new Error("Twilio configuration is incomplete");
    }

    if (!to || !message) {
      throw new Error("Phone number and message are required");
    }

    const client = twilio(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN
    );

    const response = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to,
    });

    return {
      success: true,
      messageId: response.sid,
      status: response.status,
    };
  } catch (error) {
    console.error("[SMS Service Error]:", error.message);
    throw error;
  }
};

module.exports = sendSms;