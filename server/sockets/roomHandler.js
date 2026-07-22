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
  getRoom,
  serializeRoom,
} = require("../store/rooms");

function registerRoomHandler(io, socket) {
  socket.on("room:create", ({ name, category, difficulty, rounds }, callback) => {
    const { room, player } = createRoom({
      name,
      socketId: socket.id,
      category,
      difficulty,
      rounds,
    });

    socket.join(room.code);
    callback({ code: room.code, playerId: player.id, room: serializeRoom(room) });
    io.to(room.code).emit("room:updated", serializeRoom(room));
  });

  socket.on("room:join", ({ code, name, playerId }, callback) => {
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
    const result = updateRoomSettings({ code, playerId, ...settings });
    if (result.error) return callback(result);

    callback({ room: serializeRoom(result.room) });
    io.to(code).emit("room:updated", serializeRoom(result.room));
  });

  socket.on("player:ready", ({ code, playerId }) => {
    const room = setReady({ code, playerId });
    if (!room) return;

    io.to(code).emit("room:updated", serializeRoom(room));
  });

  socket.on("player:kick", ({ code, playerId, targetId }, callback) => {
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
    if (room.hostId !== playerId) {
      return callback({ error: "Only the host can start the game" });
    }
    if (!isAllReady(room)) return callback({ error: "Both players must be ready" });
    if (room.status !== "waiting") return callback({ error: "Game has already started" });

    await beginRound(io, code, true);
    callback({ success: true });
  });

  socket.on("room:leave", ({ code, playerId }, callback) => {
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
    disconnectPlayer(socket.id).forEach((room) => {
      io.to(room.code).emit("room:updated", serializeRoom(room));
    });
  });
}

module.exports = registerRoomHandler;
