const { generateWord } = require("../controllers/aiController");

const {
  createRoom,
  joinRoom,
  setReady,
  isAllReady,
  startGame,
  getRoom,
  serializeRoom,
} = require("../store/rooms");


function registerRoomHandler(io, socket) {
  // Host bikin room baru.
  socket.on("room:create", ({ name, category, difficulty }, callback) => {
    const { room, player } = createRoom({
      name,
      socketId: socket.id,
      category,
      difficulty,
    });

    socket.join(room.code); // ? enter the room socket
    callback({ code: room.code, playerId: player.id });

    io.to(room.code).emit("room:updated", serializeRoom(room));
  });

  // ! Player joins an existing room.
  socket.on("room:join", ({ code, name }, callback) => {
    const result = joinRoom({ code, name, socketId: socket.id });

    if (result.error) {
      return callback({ error: result.error });
    }

    socket.join(code);
    callback({ playerId: result.player.id });

    io.to(code).emit("room:updated", serializeRoom(result.room));
  });

  // ! The player marks themselves as ready.
  socket.on("player:ready", async ({ code, playerId }) => {
    const room = setReady({ code, playerId });
    if (!room) return;

    io.to(code).emit("room:updated", serializeRoom(room));

    // ! Once everyone is ready → start the game.
    if (isAllReady(room)) {
      const word = await generateWord(room.category, room.difficulty);
      startGame({ code, word });
      io.to(code).emit("game:started", {
        maskedWord: "_".repeat(word.length),
        category: room.category,
        livesMax: 6,
      });
    }
  });
}

module.exports = registerRoomHandler;
