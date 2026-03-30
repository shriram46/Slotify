const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed", { stack: error.stack });
    process.exit(1);
  }
};

module.exports = connectDB;
