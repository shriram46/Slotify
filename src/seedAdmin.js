const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

// Script to create a default admin user in the system
// Used for initial setup or local development
async function seedAdmin() {
  try {
    // Connect to MongoDB using environment variable
    await mongoose.connect(process.env.MONGO_URI);

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      email: "admin@example.com"
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    // Hash the admin password before storing
    const hashedPassword = await bcrypt.hash("Passw0rd!", 10);

    // Create admin user with elevated role
    await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin user created successfully");
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed admin:", err);
    process.exit(1);
  }
}

// Execute the admin seeding script
seedAdmin();
