const { placeGuess, serializeRoom } = require("../store/rooms");
const { completeRound } = require("./roundManager");

function registerGameHandler(io, socket) {
  socket.on("game:guess", ({ code, playerId, letter }, callback) => {
    const result = placeGuess({ code, playerId, letter });
    if (result.error) return callback?.({ error: result.error });

    callback?.({ correct: result.correct });
    io.to(code).emit("game:updated", serializeRoom(result.room));

    if (result.solved) completeRound(io, code, result.player.id);
    else if (result.allFinished) completeRound(io, code);
  });
}

module.exports = registerGameHandler;
