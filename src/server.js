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

  server.listen(port, () => {
    console.log(`Session generator running at http://localhost:${port}`);
    console.log(`Open http://localhost:${port}/generate-session to get a Session ID`);
  });
}

module.exports = { startServer };
