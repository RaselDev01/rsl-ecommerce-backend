const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, or html payload");
    }

    const info = await transporter.sendMail({
      from: `"Journal Ecommerce" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error(`[EmailService Error][${new Date().toISOString()}]:`, error);
    throw error;
  }
};

module.exports = sendEmail;
