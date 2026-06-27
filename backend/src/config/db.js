import mongoose from "mongoose";

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(MONGO_URI, {
      // Recommended production options
      serverSelectionTimeoutMS: 5000,  // Timeout after 5s if no server found
      socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity
    });

    console.log(
      `✅ MongoDB connected: ${connection.connection.host} | DB: ${connection.connection.name}`
    );

    // Handle connection events after initial connect
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected.");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // Exit process so container/host can restart
  }
};

export default connectDB;