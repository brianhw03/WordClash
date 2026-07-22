/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const GameContext = createContext(null);

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
  }, []);

  const setRoomSession = useCallback((nextRoomCode, nextPlayerId) => {
    sessionStorage.setItem("roomCode", nextRoomCode);
    sessionStorage.setItem("playerId", nextPlayerId);
    setRoomCodeState(nextRoomCode);
    setPlayerIdState(nextPlayerId);
  }, []);

  const setActiveGame = useCallback((nextRoomCode) => {
    sessionStorage.setItem("activeGameRoomCode", nextRoomCode);
    setActiveGameRoomCodeState(nextRoomCode);
  }, []);

  const clearActiveGame = useCallback(() => {
    sessionStorage.removeItem("activeGameRoomCode");
    setActiveGameRoomCodeState("");
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.clear();
    setUsernameState("");
    setPlayerIdState("");
    setRoomCodeState("");
    setActiveGameRoomCodeState("");
    setRoom(null);
  }, []);

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
