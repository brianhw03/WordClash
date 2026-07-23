const crypto = require("crypto");
const generateRoomCode = require("../helpers/generateRoomCode");
const gameLogic = require("./gameLogic");

const MAX_PLAYERS = 2;
const DEFAULT_LIVES = 6;
const ROUND_DURATION_SECONDS = 45;
const VALID_CATEGORIES = ["Animal", "Country", "Job", "Movie", "Artist", "Music"];
const rooms = {};

function createPlayer(name, socketId) {
  return {
    id: crypto.randomUUID(),
    name,
    socketId,
    connected: true,
    ready: false,
    guessedLetters: [],
    lives: DEFAULT_LIVES,
    score: 0,
    finished: false,
  };
}

function createRoom({ name, socketId, category = "Animal", rounds = 3 }) {
  let code = generateRoomCode();
  while (rooms[code]) code = generateRoomCode();

  const host = createPlayer(name, socketId);
  const room = {
    code,
    hostId: host.id,
    status: "waiting",
    category: VALID_CATEGORIES.includes(category) ? category : "Animal",
    rounds: Number(rounds),
    currentRound: 0,
    roundEndsAt: null,
    word: null,
    hint: null,
    hintRevealed: false,
    usedWords: [],
    rematchVotes: {},
    players: { [host.id]: host },
    winner: null,
  };

  rooms[code] = room;
  return { room, player: host };
}

function getRoom(code) {
  return rooms[code];
}

function joinRoom({ code, name, socketId, playerId }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };

  const existingPlayer = Object.values(room.players).find(
    (player) => !player.connected && player.id === playerId,
  );

  if (existingPlayer) {
    existingPlayer.socketId = socketId;
    existingPlayer.connected = true;
    return { room, player: existingPlayer, rejoined: true };
  }

  if (room.status !== "waiting") return { error: "Game has started." };
  if (Object.keys(room.players).length >= MAX_PLAYERS) return { error: "Room is already full." };

  const player = createPlayer(name, socketId);
  room.players[player.id] = player;
  return { room, player };
}

function disconnectPlayer(socketId) {
  const updatedRooms = [];
  Object.values(rooms).forEach((room) => {
    const player = Object.values(room.players).find((candidate) => candidate.socketId === socketId);
    if (!player) return;
    player.connected = false;
    player.ready = false;
    updatedRooms.push(room);
  });
  return updatedRooms;
}

function leaveRoom({ code, playerId }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  const player = room.players[playerId];
  if (!player) return { error: "Player not found" };

  const connectedOtherPlayers = Object.values(room.players).filter(
    (candidate) => candidate.id !== playerId && candidate.connected,
  );

  if (room.hostId === playerId) {
    if (!connectedOtherPlayers.length) {
      delete rooms[code];
      return { roomDeleted: true };
    }

    const nextHost = connectedOtherPlayers[0];
    delete room.players[playerId];
    room.hostId = nextHost.id;
    return { room, hostTransferredTo: nextHost.id };
  }

  player.connected = false;
  player.ready = false;
  return { room };
}

function updateRoomSettings({ code, playerId, category, rounds }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (room.hostId !== playerId) return { error: "Only the host can change settings" };
  if (room.status !== "waiting") return { error: "Game has already started" };

  if (category && VALID_CATEGORIES.includes(category)) room.category = category;
  if (rounds && [1, 3, 5, 7].includes(Number(rounds))) room.rounds = Number(rounds);
  return { room };
}

function setReady({ code, playerId }) {
  const room = rooms[code];
  const player = room?.players[playerId];
  if (!player || !player.connected || room.status !== "waiting") return;
  player.ready = !player.ready;
  return room;
}

function kickPlayer({ code, hostId, targetId }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (room.hostId !== hostId) return { error: "Only the host can kick players" };
  if (targetId === hostId) return { error: "Host cannot kick themselves" };

  const kickedPlayer = room.players[targetId];
  if (!kickedPlayer) return { error: "Player not found" };

  delete room.players[targetId];
  return { room, kickedPlayer };
}

function isAllReady(room) {
  const players = Object.values(room.players);
  return players.length === MAX_PLAYERS && players.every((player) => player.connected && player.ready);
}

function markGameStarting(code) {
  const room = rooms[code];
  if (!room || room.status !== "waiting") return;
  room.status = "starting";
  return room;
}

function cancelGameStarting(code) {
  const room = rooms[code];
  if (!room || room.status !== "starting") return;
  room.status = "waiting";
  return room;
}

function startRound({ code, word, hint, resetMatch = false }) {
  const room = rooms[code];
  if (!room) return;

  room.word = word.toUpperCase().trim();
  room.hint = hint || null;
  room.hintRevealed = false;
  if (!Array.isArray(room.usedWords)) room.usedWords = [];
  room.usedWords.push(room.word);
  room.status = "playing";
  room.winner = null;
  room.currentRound += 1;
  room.roundEndsAt = Date.now() + ROUND_DURATION_SECONDS * 1000;

  Object.values(room.players).forEach((player) => {
    player.guessedLetters = [];
    player.lives = DEFAULT_LIVES;
    player.finished = false;
    if (resetMatch) player.score = 0;
  });
  return room;
}

function revealHint({ code }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (room.status !== "playing") return { error: "Game is not running" };
  if (!room.hint) return { error: "Hint is unavailable" };

  room.hintRevealed = true;
  return { room, hint: room.hint };
}

function placeGuess({ code, playerId, letter }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (room.status !== "playing") return { error: "Game is not running" };
  if (Date.now() >= room.roundEndsAt) return { error: "Time is up" };

  const player = room.players[playerId];
  if (!player || !player.connected) return { error: "Player not found" };
  if (player.finished) return { error: "You have already finished" };

  const guess = letter.toUpperCase();
  if (!/^[A-Z]$/.test(guess)) return { error: "Invalid letter" };
  if (player.guessedLetters.includes(guess)) return { error: "Letter already guessed" };

  player.guessedLetters.push(guess);
  const correct = gameLogic.isCorrectGuess(room.word, guess);
  if (!correct) player.lives -= 1;

  const solved = gameLogic.isWordComplete(room.word, player.guessedLetters);
  if (solved || player.lives <= 0) player.finished = true;

  const allFinished = Object.values(room.players).every((candidate) => candidate.finished);
  return { room, player, correct, solved, allFinished };
}

function finishRound({ code, winnerId = null }) {
  const room = rooms[code];
  if (!room || room.status !== "playing") return;

  const winner = winnerId ? room.players[winnerId] : null;
  if (winner) winner.score += 1;

  room.status = "round_finished";
  room.roundEndsAt = null;
  const targetWins = Math.ceil(room.rounds / 2);
  const matchWinner = Object.values(room.players).find((player) => player.score >= targetWins);
  const matchOver = Boolean(matchWinner) || room.currentRound >= room.rounds;
  if (matchOver) {
    room.status = "finished";
    room.winner = matchWinner?.id || null;
  }

  return { room, winner, matchWinner, matchOver, targetWins };
}

function resetMatch(code) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };

  room.status = "waiting";
  room.currentRound = 0;
  room.roundEndsAt = null;
  room.word = null;
  room.hint = null;
  room.hintRevealed = false;
  room.usedWords = [];
  room.winner = null;
  room.rematchVotes = {};
  Object.values(room.players).forEach((player) => {
    player.ready = false;
    player.guessedLetters = [];
    player.lives = DEFAULT_LIVES;
    player.score = 0;
    player.finished = false;
  });
  return { room };
}

function requestRematch({ code, playerId }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (room.status !== "finished") return { error: "Match is still running" };
  if (!room.players[playerId]?.connected) return { error: "Player not found" };

  room.rematchVotes[playerId] = true;
  const connectedPlayers = Object.values(room.players).filter((player) => player.connected);
  const allRequested =
    connectedPlayers.length === MAX_PLAYERS &&
    connectedPlayers.every((player) => room.rematchVotes[player.id]);

  return {
    room,
    allRequested,
    opponentUnavailable: connectedPlayers.length < MAX_PLAYERS,
  };
}

function serializeRoom(room) {
  return {
    code: room.code,
    status: room.status,
    category: room.category,
    rounds: room.rounds,
    currentRound: room.currentRound,
    targetWins: Math.ceil(room.rounds / 2),
    roundEndsAt: room.roundEndsAt,
    hint: room.hintRevealed ? room.hint : null,
    hintAvailable: Boolean(room.hint),
    hostId: room.hostId,
    players: Object.values(room.players).map((player) => ({
      id: player.id,
      name: player.name,
      connected: player.connected,
      ready: player.ready,
      lives: player.lives,
      score: player.score,
      finished: player.finished,
      maskedWord: room.word ? gameLogic.maskWord(room.word, player.guessedLetters) : null,
    })),
    winner: room.winner,
  };
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  disconnectPlayer,
  leaveRoom,
  updateRoomSettings,
  setReady,
  kickPlayer,
  isAllReady,
  markGameStarting,
  cancelGameStarting,
  startRound,
  revealHint,
  placeGuess,
  finishRound,
  resetMatch,
  requestRematch,
  serializeRoom,
  DEFAULT_LIVES,
  ROUND_DURATION_SECONDS,
};
