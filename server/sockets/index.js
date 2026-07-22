const registerRoomHandler = require("./roomHandler");
const registerGameHandler = require("./gameHandler");

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ! Register all handlers for this socket.
    registerRoomHandler(io, socket);
    registerGameHandler(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = socketHandler;