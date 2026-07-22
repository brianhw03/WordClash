const crypto = require("crypto");
const generateRoomCode = require("../helpers/generateRoomCode");
const gameLogic = require("./gameLogic");

const MAX_PLAYERS = 2;
const DEFAULT_LIVES = 6;

// ! "Database" in-memory
const rooms = {};

// ! Create a new player object with initial values.

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

// ! Host create new room.
function createRoom({ name, socketId, category, difficulty }) {
  // ! Generate an unused code.
  let code = generateRoomCode();
  while (rooms[code]) {
    code = generateRoomCode();
  }

  const host = createPlayer(name, socketId);

  const room = {
    code,
    hostId: host.id,
    status: "waiting", // ? waiting → playing → finished
    category,
    difficulty,
    word: null, // ? Filled with AI when the game starts, do not send the full data to the client.
    players: {
      [host.id]: host,
    },
    winner: null,
  };

  rooms[code] = room;
  return { room, player: host };
}

// ! Get the room by code
function getRoom(code) {
  return rooms[code];
}

// ! A player joins an existing room. Returns { room, player } or { error }.
function joinRoom({ code, name, socketId }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (Object.keys(room.players).length >= MAX_PLAYERS) {
    return { error: "Room is already full." };
  }
  if (room.status !== "waiting") {
    return { error: "Game has started." };
  }

  const player = createPlayer(name, socketId);
  room.players[player.id] = player;
  return { room, player };
}

// ! Mark the player as ready.
function setReady({ code, playerId }) {
  const room = rooms[code];
  if (!room) return;
  const player = room.players[playerId];
  if (!player) return;
  player.ready = true;
  return room;
}

// ! Check if all players (there must be two) are ready.
function isAllReady(room) {
  const players = Object.values(room.players);
  return players.length === MAX_PLAYERS && players.every((p) => p.ready);
}

// ! Start game: set word (from AI), change status, reset player state.
function startGame({ code, word }) {
  const room = rooms[code];
  if (!room) return;

  room.word = word.toUpperCase().trim(); 
  room.status = "playing";
  room.winner = null;

  // ! Reset each player to their initial state.
  Object.values(room.players).forEach((player) => {
    player.guessedLetters = [];
    player.lives = DEFAULT_LIVES;
    player.score = 0;
    player.finished = false;
  });

  return room;
}

// ! The player guesses a single letter. Returns { room, player } or { error }.
function placeGuess({ code, playerId, letter }) {
  const room = rooms[code];
  if (!room) return { error: "Room not found" };
  if (room.status !== "playing") return { error: "Game is not running" };

  const player = room.players[playerId];
  if (!player) return { error: "Player not found" };
  if (player.finished) return { error: "You have already finished" };

  const guess = letter.toUpperCase();

  // Tolak huruf yang udah pernah ditebak (biar gak double).
  if (player.guessedLetters.includes(guess)) {
    return { error: "Letter already guessed" };
  }

  player.guessedLetters.push(guess);

  // ! If the guess is wrong, lose a life.
  if (!gameLogic.isCorrectGuess(room.word, guess)) {
    player.lives -= 1;
  }

  // ! Condition check complete for this player.
  const solved = gameLogic.isWordComplete(room.word, player.guessedLetters);
  const dead = player.lives <= 0;

  if (solved) {
    player.finished = true;
    player.score = gameLogic.calculateScore(player.lives); // ? remaining health × 100
  } else if (dead) {
    player.finished = true;
    player.score = 0; // ? Lost because lives ran out
  }

  return { room, player };
}

// ! Check if all players have finished (won or run out of lives).
function isGameOver(room) {
  const players = Object.values(room.players);
  return players.length === MAX_PLAYERS && players.every((p) => p.finished);
}

// ! Determine the winner based on the highest score.
// ! Return a player object, or null if a tie.
function getWinner(room) {
  const players = Object.values(room.players);
  const [p1, p2] = players;

  if (p1.score > p2.score) return p1;
  if (p2.score > p1.score) return p2;
  return null; // seri
}

// ! Finalization: set status to 'finished' and save the winner.
function finishGame(room) {
  room.status = "finished";
  const winner = getWinner(room);
  room.winner = winner ? winner.id : null; // null = draw
  return room;
}


module.exports = {
  rooms, // ! => nanti socket handler butuh akses langsung ke object ini. Semua manipulasi state lewat fungsi-fungsi di sini biar terpusat.
  createRoom,
  getRoom,
  joinRoom,
  setReady,
  isAllReady,
  startGame,
  placeGuess,
  isGameOver,
  getWinner,
  finishGame,
};