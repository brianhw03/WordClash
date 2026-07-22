/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { socket } from "../lib/socket";

export const GameContext = createContext(null);
const RECONNECT_IDS_KEY = "wordclash.reconnectPlayerIds";

function usernameKey(value = "") {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getReconnectPlayerId(name) {
  try {
    const savedIds = JSON.parse(localStorage.getItem(RECONNECT_IDS_KEY) || "{}");
    return savedIds[usernameKey(name)] || "";
  } catch {
    return "";
  }
}

function saveReconnectPlayerId(name, playerId) {
  try {
    const savedIds = JSON.parse(localStorage.getItem(RECONNECT_IDS_KEY) || "{}");
    savedIds[usernameKey(name)] = playerId;
    localStorage.setItem(RECONNECT_IDS_KEY, JSON.stringify(savedIds));
  } catch {
    // Reconnect can still work in the current tab through sessionStorage.
  }
}

function removeReconnectPlayerId(name) {
  try {
    const savedIds = JSON.parse(localStorage.getItem(RECONNECT_IDS_KEY) || "{}");
    delete savedIds[usernameKey(name)];
    localStorage.setItem(RECONNECT_IDS_KEY, JSON.stringify(savedIds));
  } catch {
    // Nothing else is needed when browser storage is unavailable.
  }
}

export default function GameProvider({ children }) {
  const [username, setUsernameState] = useState(() => sessionStorage.getItem("username") || "");
  const [playerId, setPlayerIdState] = useState(() => sessionStorage.getItem("playerId") || "");
  const [roomCode, setRoomCodeState] = useState(() => sessionStorage.getItem("roomCode") || "");
  const [activeGameRoomCode, setActiveGameRoomCodeState] = useState(
    () => sessionStorage.getItem("activeGameRoomCode") || "",
  );
  const [room, setRoom] = useState(null);

  const setUsername = useCallback((value) => {
    const nextUsername = value.trim();
    sessionStorage.setItem("username", nextUsername);
    setUsernameState(nextUsername);
    const reconnectPlayerId = getReconnectPlayerId(nextUsername);
    if (reconnectPlayerId) sessionStorage.setItem("playerId", reconnectPlayerId);
    else sessionStorage.removeItem("playerId");
    setPlayerIdState(reconnectPlayerId);
  }, []);

  const setRoomSession = useCallback((nextRoomCode, nextPlayerId) => {
    sessionStorage.setItem("roomCode", nextRoomCode);
    sessionStorage.setItem("playerId", nextPlayerId);
    setRoomCodeState(nextRoomCode);
    setPlayerIdState(nextPlayerId);
    if (username) saveReconnectPlayerId(username, nextPlayerId);
  }, [username]);

  const setActiveGame = useCallback((nextRoomCode) => {
    sessionStorage.setItem("activeGameRoomCode", nextRoomCode);
    setActiveGameRoomCodeState(nextRoomCode);
  }, []);

  const clearActiveGame = useCallback(() => {
    sessionStorage.removeItem("activeGameRoomCode");
    setActiveGameRoomCodeState("");
  }, []);

  const clearSession = useCallback(() => {
    if (username) removeReconnectPlayerId(username);
    sessionStorage.clear();
    setUsernameState("");
    setPlayerIdState("");
    setRoomCodeState("");
    setActiveGameRoomCodeState("");
    setRoom(null);
  }, [username]);

  useEffect(() => {
    if (!username) return undefined;

    const claimUsername = () => socket.emit("username:claim", { name: username }, (result) => {
      if (result.error) clearSession();
    });

    if (socket.connected) claimUsername();
    socket.on("connect", claimUsername);
    return () => socket.off("connect", claimUsername);
  }, [clearSession, username]);

  const value = useMemo(() => ({
    username,
    playerId,
    roomCode,
    activeGameRoomCode,
    room,
    setUsername,
    setRoomSession,
    setActiveGame,
    clearActiveGame,
    clearSession,
    setRoom,
  }), [
    activeGameRoomCode,
    clearActiveGame,
    clearSession,
    playerId,
    room,
    roomCode,
    setActiveGame,
    setRoomSession,
    setUsername,
    username,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
