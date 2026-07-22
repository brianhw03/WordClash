const { generateWord } = require("../controllers/aiController");
const {
  getRoom,
  startRound,
  finishRound,
  serializeRoom,
  ROUND_DURATION_SECONDS,
} = require("../store/rooms");

const roundTimers = new Map();

function clearRoundTimer(code) {
  const timer = roundTimers.get(code);
  if (!timer) return;
  clearInterval(timer.interval);
  clearTimeout(timer.timeout);
  roundTimers.delete(code);
}

function beginTimer(io, code) {
  clearRoundTimer(code);

  const emitTime = () => {
    const room = getRoom(code);
    if (!room || room.status !== "playing") return;
    const remaining = Math.max(0, Math.ceil((room.roundEndsAt - Date.now()) / 1000));
    io.to(code).emit("game:timer", { remaining });
  };

  emitTime();
  const interval = setInterval(emitTime, 1000);
  const timeout = setTimeout(() => completeRound(io, code), ROUND_DURATION_SECONDS * 1000);
  roundTimers.set(code, { interval, timeout });
}

async function beginRound(io, code, resetMatch = false) {
  const room = getRoom(code);
  if (!room) return;

  const word = await generateWord(room.category, room.usedWords);
  const startedRoom = startRound({ code, word, resetMatch });
  beginTimer(io, code);
  io.to(code).emit("room:updated", serializeRoom(startedRoom));
  io.to(code).emit("game:started", {
    category: startedRoom.category,
    currentRound: startedRoom.currentRound,
    rounds: startedRoom.rounds,
    livesMax: 6,
  });
}

function completeRound(io, code, winnerId = null) {
  const room = getRoom(code);
  if (!room || room.status !== "playing") return;
  clearRoundTimer(code);

  const result = finishRound({ code, winnerId });
  if (!result) return;

  io.to(code).emit("game:updated", serializeRoom(result.room));
  io.to(code).emit("round:ended", {
    winner: result.winner?.name || null,
    word: room.word,
    matchOver: result.matchOver,
    targetWins: result.targetWins,
  });

  if (result.matchOver) {
    io.to(code).emit("game:over", {
      winner: result.matchWinner?.name || null,
      winnerId: result.matchWinner?.id || null,
      players: serializeRoom(result.room).players,
    });
    return;
  }

  setTimeout(() => beginRound(io, code), 3000);
}

module.exports = { beginRound, completeRound, clearRoundTimer };
