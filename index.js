require("dotenv").config();

const mongoose = require("mongoose");
const { startServer } = require("./src/server");

async function main() {
  const port = process.env.PORT || 4000;

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("WARNING: MONGODB_URI is not set. Sessions won't be saved to DB.");
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("MongoDB connection failed:", err.message);
      console.error("Continuing without DB — sessions won't be persisted.");
    }
  }

  startServer(port);
}

main();
