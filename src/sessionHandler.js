const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const Session = require("./models/Session");

const TEMP_DIR = path.join(__dirname, "..", "temp_sessions");
const TIMEOUT_MS = 5 * 60 * 1000;

const logger = pino({ level: "silent" });

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function deleteFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
}

function serializeAuthFolder(authDir) {
  const bundle = {};
  const files = fs.readdirSync(authDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(authDir, file), "utf-8");
    bundle[file.replace(".json", "")] = JSON.parse(raw);
  }

  return Buffer.from(JSON.stringify(bundle)).toString("base64");
}

async function handleSession(socket) {
  ensureTempDir();

  const authDir = path.join(TEMP_DIR, `auth_${socket.id}`);
  let waSocket = null;
  let destroyed = false;

  function cleanup() {
    if (destroyed) return;
    destroyed = true;

    try {
      if (waSocket) {
        waSocket.ev.removeAllListeners();
        waSocket.end();
      }
    } catch (_) {}

    deleteFolder(authDir);
  }

  const timeout = setTimeout(() => {
    socket.emit("timeout", "Session generation timed out. Refresh to try again.");
    cleanup();
  }, TIMEOUT_MS);

  socket.on("disconnect", () => {
    clearTimeout(timeout);
    cleanup();
  });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    waSocket = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ["ZAYN-MD Session", "Chrome", "1.0.0"],
    });

    waSocket.ev.on("creds.update", saveCreds);

    waSocket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (destroyed) return;

      if (qr) {
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          socket.emit("qr", qrDataUrl);
        } catch (err) {
          console.error("QR generation failed:", err.message);
        }
      }

      if (connection === "open") {
        clearTimeout(timeout);

        try {
          await new Promise((r) => setTimeout(r, 1500));

          const sessionId = serializeAuthFolder(authDir);

          await Session.create({ sessionId });

          socket.emit("session-id", sessionId);
        } catch (err) {
          console.error("Session serialization failed:", err.message);
          socket.emit("error", "Failed to generate session. Please try again.");
        }

        cleanup();
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut && !destroyed) {
          console.log("Temp session connection closed unexpectedly:", statusCode);
        }
        cleanup();
      }
    });
  } catch (err) {
    console.error("Session handler error:", err.message);
    clearTimeout(timeout);
    cleanup();
  }
}

module.exports = { handleSession };
