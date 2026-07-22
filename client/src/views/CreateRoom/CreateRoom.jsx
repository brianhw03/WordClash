import "./CreateRoom.css";

import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRightFromBracket,
  FaCircleCheck,
  FaCopy,
  FaPlay,
} from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";

import PageBackground from "../../components/PageBackground";
import Logo from "../../components/Logo";
import { socket } from "../../lib/socket";
import { toastError, toastSuccess } from "../../utils/toastify";

export default function CreateRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const playerId = sessionStorage.getItem("playerId");

  useEffect(() => {
    const handleRoomUpdate = (updatedRoom) => {
      if (updatedRoom.code === roomCode) setRoom(updatedRoom);
    };

    const handleGameStarted = () => toastSuccess("Game has started");

    socket.on("room:updated", handleRoomUpdate);
    socket.on("game:started", handleGameStarted);
    socket.emit("room:get", { code: roomCode }, (result) => {
      if (result.error) {
        toastError(result.error);
        navigate("/home");
        return;
      }

      setRoom(result.room);
    });

    return () => {
      socket.off("room:updated", handleRoomUpdate);
      socket.off("game:started", handleGameStarted);
    };
  }, [navigate, roomCode]);

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.id === playerId),
    [playerId, room],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toastSuccess("Room code copied");
    } catch {
      toastError("Unable to copy room code");
    }
  };

  const handleReady = () => {
    if (!playerId) {
      toastError("Player session was not found. Please join the room again.");
      navigate("/home");
      return;
    }

    socket.emit("player:ready", { code: roomCode, playerId });
  };

  const handleLeave = () => {
    socket.emit("room:leave", { code: roomCode, playerId }, (result) => {
      if (result.error) return toastError(result.error);

      navigate("/home");
    });
  };

  const handleSettingChange = (field) => (event) => {
    socket.emit(
      "room:settings",
      { code: roomCode, playerId, [field]: event.target.value },
      (result) => {
        if (result.error) toastError(result.error);
      },
    );
  };

  const handleStartGame = () => {
    socket.emit("game:start", { code: roomCode, playerId }, (result) => {
      if (result.error) toastError(result.error);
    });
  };

  const players = room?.players || [];
  const isHost = room?.hostId === playerId;
  const canStart =
    isHost && players.length === 2 && players.every((player) => player.ready);

  return (
    <main className="create-room-page">
      <PageBackground />

      <div className="room-card">
        <div className="text-center">
          <Logo />
          <p className="subtitle">Waiting Room</p>
        </div>

        <div className="section-title">Room Code</div>
        <div className="room-code">
          <h2>{roomCode}</h2>
          <button className="copy-btn" onClick={handleCopy}>
            <FaCopy />
            <span>Copy</span>
          </button>
        </div>

        <div className="section-title">Players</div>
        {players.map((player) => (
          <div className="player" key={player.id}>
            <div>
              {player.id === room.hostId ? "👑" : "😀"} {player.name}
              {player.id === room.hostId && <small> Host</small>}
            </div>
            <div className={player.ready ? "ready" : "waiting"}>
              {player.ready && <FaCircleCheck />} {player.ready
                ? "Ready"
                : player.connected
                  ? "Waiting..."
                  : "Disconnected"}
            </div>
          </div>
        ))}

        {players.length < 2 && (
          <div className="player">
            <div>😀 Waiting Player...</div>
            <div className="waiting">Waiting...</div>
          </div>
        )}

        <div className="row mt-4 g-3">
          <div className="col-md-4">
            <div className="section-title">Category</div>
            <select
              className="form-select"
              disabled={!isHost}
              onChange={handleSettingChange("category")}
              value={room?.category || "General"}
            >
              <option>General</option>
              <option>Technology</option>
              <option>Animals</option>
              <option>Movies</option>
              <option>Sports</option>
              <option>Countries</option>
            </select>
          </div>

          <div className="col-md-4">
            <div className="section-title">Difficulty</div>
            <select
              className="form-select"
              disabled={!isHost}
              onChange={handleSettingChange("difficulty")}
              value={room?.difficulty || "Easy"}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div className="col-md-4">
            <div className="section-title">Rounds</div>
            <select
              className="form-select"
              disabled={!isHost}
              onChange={handleSettingChange("rounds")}
              value={String(room?.rounds || 3)}
            >
              <option value="1">1 Round</option>
              <option value="3">3 Rounds</option>
              <option value="5">5 Rounds</option>
            </select>
          </div>
        </div>

        <div className="row mt-4 g-3">
          <div className="col-6">
            <button className="btn btn-leave w-100" onClick={handleLeave}>
              <FaArrowRightFromBracket /> Leave
            </button>
          </div>
          <div className="col-6">
            <button
              className="btn btn-ready w-100"
              disabled={currentPlayer?.ready}
              onClick={handleReady}
            >
              <FaCircleCheck /> {currentPlayer?.ready ? "Ready" : "Ready"}
            </button>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-12">
            <button
              className="btn btn-start w-100"
              disabled={!canStart}
              onClick={handleStartGame}
            >
              <FaPlay /> Start Game
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
