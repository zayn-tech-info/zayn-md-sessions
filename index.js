require("dotenv").config();

const mongoose = require("mongoose");
const { startServer } = require("./src/server");

async function main() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }

  const port = process.env.PORT || 4000;
  startServer(port);
}

main();
