require("dotenv").config();

const express = require("express");
const app = express();
const port = Number(process.env.PORT) || 3000;
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const socketHandler = require("./sockets");
const normalizeOrigin = (origin = "") => origin.trim().replace(/\/$/, "");
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST"],
};

// !Setup socket server
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// !Middleware
app.use(cors(corsOptions))
app.use(express.json())

app.get("/", (req, res) => {
  res.send("WordClash server is running");
});

// !Connection socket
// io.on("connection", (socket) => {
//   // ...
// });
socketHandler(io);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
