import "./Home.css";

import { useState } from "react";
import { useNavigate } from "react-router";
import { FaPlus, FaRightFromBracket, FaRightToBracket } from "react-icons/fa6";

import Logo from "../../components/Logo";
import PageBackground from "../../components/PageBackground";
import MenuCard from "../../components/MenuCard";
import JoinRoomModal from "../../components/JoinRoomModal";
import { socket } from "../../lib/socket";
import { toastError, toastSuccess } from "../../utils/toastify";
import { useGame } from "../../context/GameContext";

export default function Home() {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);

  const {
    username,
    playerId,
    setRoomSession,
    setActiveGame,
    clearActiveGame,
    clearSession,
    setRoom,
  } = useGame();

  const handleCreateRoom = () => {
    if (!username) {
      toastError("Username is required");
      navigate("/");
      return;
    }

    socket.emit(
      "room:create",
      { name: username, category: "Animal" },
      (result) => {
        if (result.error) return toastError(result.error);

        setRoomSession(result.code, result.playerId);
        setRoom(result.room);
        toastSuccess(`Room ${result.code} created`);
        navigate(`/room/${result.code}`);
      },
    );
  };

  const handleJoinRoom = (roomCode) => {
    if (!username) {
      toastError("Username is required");
      navigate("/");
      return;
    }

    socket.emit(
      "room:join",
      {
        code: roomCode,
        name: username,
        playerId,
      },
      (result) => {
      if (result.error) return toastError(result.error);

      setRoomSession(roomCode, result.playerId);
      setRoom(result.room);
      setShowModal(false);
      toastSuccess(result.rejoined ? `Rejoined room ${roomCode}` : `Joined room ${roomCode}`);
      const isGameInProgress = result.room.status !== "waiting";
      if (isGameInProgress) {
        setActiveGame(roomCode);
        navigate(`/game/${roomCode}`);
      } else {
        clearActiveGame();
        navigate(`/room/${roomCode}`);
      }
      },
    );
  };

  const handleQuitGame = () => {
    clearSession();
    navigate("/");
  };

  return (
    <main className="home-page">
      <PageBackground />

      <div className="card-home">
        <div className="text-center">
          <Logo />

          <p className="home-subtitle">
            Welcome back! Choose how you want to play.
          </p>
        </div>

        <div className="row g-4">
          <div className="col-6 d-flex">
            <MenuCard
              icon={<FaPlus />}
              title="Create Room"
              description="Become the host and invite your friend."
              onClick={handleCreateRoom}
            />
          </div>

          <div className="col-6 d-flex">
            <MenuCard
              icon={<FaRightToBracket />}
              title="Join Room"
              description="Enter an existing room."
              onClick={() => setShowModal(true)}
            />
          </div>
        </div>

        <button className="quit-game-btn" onClick={handleQuitGame}>
          <FaRightFromBracket /> Quit Game
        </button>

        <div className="username text-center">
          Logged in as <span>{username}</span>
        </div>
      </div>

      <JoinRoomModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onJoin={handleJoinRoom}
      />
    </main>
  );
}
