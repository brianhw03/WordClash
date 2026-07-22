import "./Home.css";

import { useState } from "react";
import { useNavigate } from "react-router";
import { FaPlus, FaRightToBracket } from "react-icons/fa6";

import Logo from "../../components/Logo";
import PageBackground from "../../components/PageBackground";
import MenuCard from "../../components/MenuCard";
import JoinRoomModal from "../../components/JoinRoomModal";

export default function Home() {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);

  const username = localStorage.getItem("username");

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
              onClick={() => navigate("/room")}
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

        <div className="username text-center">
          Logged in as <span>{username}</span>
        </div>
      </div>

      <JoinRoomModal show={showModal} onClose={() => setShowModal(false)} />
    </main>
  );
}
