import "./CreateRoom.css";

import { useEffect, useMemo } from "react";
import {
  FaArrowRightFromBracket,
  FaCircleCheck,
  FaCopy,
  FaPlay,
  FaUserXmark,
} from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";

import PageBackground from "../../components/PageBackground";
import Logo from "../../components/Logo";
import { socket } from "../../lib/socket";
import { toastError, toastSuccess } from "../../utils/toastify";
import { useGame } from "../../context/GameContext";

export default function CreateRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { playerId, room, setRoom, setActiveGame } = useGame();

  useEffect(() => {
    const handleRoomUpdate = (updatedRoom) => {
      if (updatedRoom.code === roomCode) setRoom(updatedRoom);
    };

    const handlePlayerKicked = ({ playerId: kickedPlayerId }) => {
      if (kickedPlayerId === playerId) {
        toastError("You were kicked from the room");
        navigate("/home");
      }
    };

    const handleGameStarted = () => {
      toastSuccess("Game has started");
      setActiveGame(roomCode);
      navigate(`/game/${roomCode}`);
    };

    socket.on("room:updated", handleRoomUpdate);
    socket.on("game:started", handleGameStarted);
    socket.on("player:kicked", handlePlayerKicked);
    socket.emit("room:get", { code: roomCode }, (result) => {
      if (result.error) {
        toastError(result.error);
        navigate("/home");
        return;
      }

      if (result.room.status !== "waiting") {
        setActiveGame(roomCode);
        navigate(`/game/${roomCode}`, { replace: true });
        return;
      }

      setRoom(result.room);
    });

    return () => {
      socket.off("room:updated", handleRoomUpdate);
      socket.off("game:started", handleGameStarted);
      socket.off("player:kicked", handlePlayerKicked);
    };
  }, [navigate, playerId, roomCode, setActiveGame, setRoom]);

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

  const handleKick = (targetId) => {
    socket.emit("player:kick", { code: roomCode, playerId, targetId }, (result) => {
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
            <div className="player-identity">
              {player.id === room.hostId ? "👑" : "😀"} {player.name}
              {player.id === room.hostId && <small> Host</small>}
              {isHost && player.id !== playerId && (
                <button className="kick-btn" onClick={() => handleKick(player.id)} title="Kick player">
                  <FaUserXmark />
                </button>
              )}
            </div>
            <div className="player-status">
              <div className={player.ready ? "ready" : "waiting"}>
                {player.ready && <FaCircleCheck />} {player.ready
                  ? "Ready"
                  : player.connected
                    ? "Not Ready"
                    : "Disconnected"}
              </div>
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
          <div className="col-md-6">
            <div className="section-title">Category</div>
            <select
              className="form-select"
              disabled={!isHost}
              onChange={handleSettingChange("category")}
              value={room?.category || "Animal"}
            >
              <option>Animal</option>
              <option>Country</option>
              <option>Job</option>
              <option>Movie</option>
              <option>Artist</option>
              <option>Music</option>
            </select>
          </div>

          <div className="col-md-6">
            <div className="section-title">Rounds</div>
            <select
              className="form-select"
              disabled={!isHost}
              onChange={handleSettingChange("rounds")}
              value={String(room?.rounds || 3)}
            >
              <option value="1">Best of 1</option>
              <option value="3">Best of 3</option>
              <option value="5">Best of 5</option>
              <option value="7">Best of 7</option>
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
              className={`btn btn-ready w-100 ${currentPlayer?.ready ? "ready-active" : ""}`}
              onClick={handleReady}
            >
              <FaCircleCheck /> Ready
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
