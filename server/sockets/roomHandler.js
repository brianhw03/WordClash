const { beginRound, clearRoundTimer } = require("./roundManager");
const {
  createRoom,
  joinRoom,
  leaveRoom,
  disconnectPlayer,
  updateRoomSettings,
  resetMatch,
  requestRematch,
  setReady,
  kickPlayer,
  isAllReady,
  markGameStarting,
  cancelGameStarting,
  getRoom,
  serializeRoom,
} = require("../store/rooms");
const {
  claimUsername,
  isUsernameClaimedBy,
  releaseUsername,
  releaseSocketUsername,
} = require("../store/usernames");

function ownsPlayer(room, playerId, socketId) {
  const player = room?.players[playerId];
  return Boolean(player?.connected && player.socketId === socketId);
}

function registerRoomHandler(io, socket) {
  socket.on("username:claim", ({ name }, callback) => {
    const result = claimUsername({ name, socketId: socket.id });
    if (result.error) return callback(result);

    socket.data.username = result.username;
    callback({ success: true, username: result.username });
  });

  socket.on("username:release", ({ name }, callback = () => {}) => {
    releaseUsername({ name, socketId: socket.id });
    if (socket.data.username === name?.trim()) delete socket.data.username;
    callback({ success: true });
  });

  socket.on("room:create", ({ name, category, rounds }, callback) => {
    if (!isUsernameClaimedBy({ name, socketId: socket.id })) {
      return callback({ error: "Please choose an available username first" });
    }
    const { room, player } = createRoom({
      name,
      socketId: socket.id,
      category,
      rounds,
    });

    socket.join(room.code);
    callback({ code: room.code, playerId: player.id, room: serializeRoom(room) });
    io.to(room.code).emit("room:updated", serializeRoom(room));
  });

  socket.on("room:join", ({ code, name, playerId }, callback) => {
    const room = getRoom(code);
    const knownPlayer = room?.players[playerId];
    const isReconnect = Boolean(
      knownPlayer &&
      !knownPlayer.connected &&
      knownPlayer.name.trim().toLowerCase() === String(name || "").trim().toLowerCase(),
    );

    // A reconnect may arrive before the client has re-claimed its username after a socket reconnect.
    // The stored playerId plus matching name proves this is an existing room player.
    if (!isReconnect && !isUsernameClaimedBy({ name, socketId: socket.id })) {
      return callback({ error: "Please choose an available username first" });
    }
    const result = joinRoom({ code, name, socketId: socket.id, playerId });
    if (result.error) return callback({ error: result.error });

    socket.join(code);
    callback({
      playerId: result.player.id,
      rejoined: result.rejoined,
      room: serializeRoom(result.room),
    });
    io.to(code).emit("room:updated", serializeRoom(result.room));
  });

  socket.on("room:get", ({ code }, callback) => {
    const room = getRoom(code);
    if (!room) return callback({ error: "Room not found" });

    callback({ room: serializeRoom(room) });
  });

  socket.on("room:settings", ({ code, playerId, ...settings }, callback) => {
    const room = getRoom(code);
    if (!ownsPlayer(room, playerId, socket.id)) {
      return callback({ error: "Unauthorized player" });
    }
    const result = updateRoomSettings({ code, playerId, ...settings });
    if (result.error) return callback(result);

    callback({ room: serializeRoom(result.room) });
    io.to(code).emit("room:updated", serializeRoom(result.room));
  });

  socket.on("player:ready", ({ code, playerId }) => {
    if (!ownsPlayer(getRoom(code), playerId, socket.id)) return;
    const room = setReady({ code, playerId });
    if (!room) return;

    io.to(code).emit("room:updated", serializeRoom(room));
  });

  socket.on("player:kick", ({ code, playerId, targetId }, callback) => {
    const room = getRoom(code);
    if (!ownsPlayer(room, playerId, socket.id)) {
      return callback({ error: "Unauthorized player" });
    }
    const result = kickPlayer({ code, hostId: playerId, targetId });
    if (result.error) return callback(result);

    const kickedSocket = io.sockets.sockets.get(result.kickedPlayer.socketId);
    kickedSocket?.leave(code);
    io.to(result.kickedPlayer.socketId).emit("player:kicked", { playerId: targetId });
    callback({ success: true });
    io.to(code).emit("room:updated", serializeRoom(result.room));
  });

  socket.on("game:start", async ({ code, playerId }, callback) => {
    const room = getRoom(code);
    if (!room) return callback({ error: "Room not found" });
    if (!ownsPlayer(room, playerId, socket.id)) {
      return callback({ error: "Unauthorized player" });
    }
    if (room.hostId !== playerId) {
      return callback({ error: "Only the host can start the game" });
    }
    if (!isAllReady(room)) return callback({ error: "Both players must be ready" });
    if (room.status !== "waiting") return callback({ error: "Game has already started" });

    markGameStarting(code);
    callback({ success: true, starting: true });

    try {
      await beginRound(io, code, true);
    } catch (error) {
      const resetRoom = cancelGameStarting(code);
      if (resetRoom) io.to(code).emit("room:updated", serializeRoom(resetRoom));
      io.to(socket.id).emit("game:start-error", { error: "Unable to start the game" });
    }
  });

  socket.on("room:leave", ({ code, playerId }, callback) => {
    if (!ownsPlayer(getRoom(code), playerId, socket.id)) {
      return callback({ error: "Unauthorized player" });
    }
    const result = leaveRoom({ code, playerId });
    if (result.error) return callback(result);

    socket.leave(code);
    callback({ success: true });
    io.to(code).emit("room:updated", serializeRoom(result.room));

    if (result.room.status === "finished") {
      io.to(code).emit("game:rematch-cancelled", { countdown: 3 });
    }
  });

  socket.on("game:rematch", ({ code, playerId }, callback) => {
    const room = getRoom(code);
    if (!room) return callback({ error: "Room not found" });
    if (!ownsPlayer(room, playerId, socket.id)) {
      return callback({ error: "Unauthorized player" });
    }
    const request = requestRematch({ code, playerId });
    if (request.error) return callback(request);

    callback({ success: true, waiting: !request.allRequested });
    io.to(code).emit("game:rematch-status", {
      requestedPlayerIds: Object.keys(request.room.rematchVotes),
    });

    if (request.opponentUnavailable) {
      io.to(code).emit("game:rematch-cancelled", { countdown: 3 });
      return;
    }

    if (request.allRequested) {
      const result = resetMatch(code);
      io.to(code).emit("room:updated", serializeRoom(result.room));
      io.to(code).emit("game:rematch", { code });
    }
  });

  socket.on("disconnect", () => {
    releaseSocketUsername(socket.id);
    disconnectPlayer(socket.id).forEach((room) => {
      io.to(room.code).emit("room:updated", serializeRoom(room));
    });
  });
}

module.exports = registerRoomHandler;
