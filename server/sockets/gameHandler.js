const {
  getRoom,
  placeGuess,
  revealHint,
  serializeRoom,
} = require("../store/rooms");
const { completeRound } = require("./roundManager");

function registerGameHandler(io, socket) {
  socket.on("game:hint", ({ code, playerId }, callback) => {
    const room = getRoom(code);
    const player = room?.players[playerId];
    if (!player?.connected || player.socketId !== socket.id) {
      return callback?.({ error: "Unauthorized player" });
    }

    const result = revealHint({ code });
    if (result.error) return callback?.({ error: result.error });

    callback?.({ success: true, hint: result.hint });
    io.to(code).emit("game:updated", serializeRoom(result.room));
  });

  socket.on("game:guess", ({ code, playerId, letter }, callback) => {
    const room = getRoom(code);
    const player = room?.players[playerId];
    if (!player?.connected || player.socketId !== socket.id) {
      return callback?.({ error: "Unauthorized player" });
    }
    const result = placeGuess({ code, playerId, letter });
    if (result.error) return callback?.({ error: result.error });

    callback?.({ correct: result.correct });
    io.to(code).emit("game:updated", serializeRoom(result.room));

    if (result.solved) completeRound(io, code, result.player.id);
    else if (result.allFinished) completeRound(io, code);
  });
}

module.exports = registerGameHandler;
