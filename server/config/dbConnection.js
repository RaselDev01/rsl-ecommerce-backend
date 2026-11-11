const mongoose = require("mongoose");

async function dbConnection() {
  try {
    if (!process.env.DB_URL) {
      throw new Error("DB_URL is not configured.");
    }

    await mongoose.connect(process.env.DB_URL);

    console.log("MongoDB connected successfully.");

    return true;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    throw error;
  }
}

module.exports = dbConnection;
