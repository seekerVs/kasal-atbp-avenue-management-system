const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // retry if no server found in 5s
      socketTimeoutMS: 45000,         // close idle sockets after 45s
      heartbeatFrequencyMS: 10000,    // keep-alive heartbeat
    });
    console.log("✅ MongoDB Connected successfully.");
  } catch (error) {
    console.error("❌ Initial MongoDB connection error:", error.message);

    // Retry after 5 seconds instead of exiting
    setTimeout(connectDB, 5000);
  }
};

// Extra event listeners for resilience
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Retrying...");
  connectDB();
});

mongoose.connection.on("error", (err) => {
  console.error("⚠️ MongoDB error:", err);
});

module.exports = connectDB;
