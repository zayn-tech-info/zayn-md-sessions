const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  used: { type: Boolean, default: false },
});

module.exports = mongoose.model("Session", sessionSchema);
