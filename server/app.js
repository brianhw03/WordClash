if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const port = 3000;
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const socketHandler = require("./sockets");

// !Setup socket server
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// !Middleware
app.use(cors())
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
