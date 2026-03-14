const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { handleSession } = require("./sessionHandler");

function startServer(port) {
  const app = express();
  app.use(cors());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/", (req, res) => {
    res.json({ status: "ok", service: "zayn-md-session-generator" });
  });

  app.get("/generate-session", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`New session request: ${socket.id}`);
    handleSession(socket);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Session generator running on port ${port}`);
  });
}

module.exports = { startServer };
