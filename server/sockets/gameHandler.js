const {
  placeGuess,
  isGameOver,
  finishGame,
  getWinner,
  serializeRoom,
} = require("../store/rooms");

function registerGameHandler(io, socket) {
  socket.on("game:guess", ({ code, playerId, letter }, callback) => {
    const result = placeGuess({ code, playerId, letter });

    // ! If there are any errors (double letters, etc.), just let the sender know.
    if (result.error) {
      if (callback) callback({ error: result.error });
      return;
    }

    const room = result.room;

    // ! Broadcast the latest state to everyone in the room.
    io.to(code).emit("game:updated", serializeRoom(room));

    // ! Check if the game is over.
    if (isGameOver(room)) {
      finishGame(room);
      const winner = getWinner(room);
      io.to(code).emit("game:over", {
        winner: winner ? winner.name : null, // ? null = draw
        word: room.word, // ? The original words are only being revealed here.
        players: serializeRoom(room).players,
      });
    }
  });
}

module.exports = registerGameHandler;