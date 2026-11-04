require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../model/userSchema");

async function createSuperAdmin() {
  let connectionInstance = null;

  try {
    const dbUrl = process.env.DB_URL;
    const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME?.trim();

    if (!dbUrl || !email || !password || !name) {
      throw new Error("Initialization rejected: Core configuration variables are unassigned");
    }

    if (password.length < 12) {
      throw new Error("Policy violation: Identity credential length must meet the 12-character minimum security threshold");
    }

    connectionInstance = await mongoose.connect(dbUrl, {
      autoIndex: true,
    });

    const existingUser = await User.findOne({ email }).select("role").lean();

    if (existingUser) {
      if (existingUser.role === "super_admin") {
        console.info(`[System Seeder][${new Date().toISOString()}]: Core administrative instance already verified within database state.`);
        return;
      }
      throw new Error("Identity mapping failure: Target identifier is already bound to another profile structural domain");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create([{
      name,
      email,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
    }]);

    console.info(`[System Seeder][${new Date().toISOString()}]: Root authority context successfully registered onto identity repository.`);
  } catch (error) {
    console.error(`[System Seeder Critical][${new Date().toISOString()}]: Seeding transaction terminated natively: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (connectionInstance && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createSuperAdmin();
