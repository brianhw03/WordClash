import "./CreateRoom.css";

import { FaArrowRightFromBracket, FaCircleCheck, FaCopy } from "react-icons/fa6";

import PageBackground from "../../components/PageBackground";
import Logo from "../../components/Logo";

export default function CreateRoom() {
  const roomCode = "ABC123";

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

          <button className="copy-btn">
            <FaCopy />
            <span>Copy</span>
          </button>
        </div>

        <div className="section-title">Players</div>

        <div className="player">
          <div>
            👑 Brian
            <small> Host</small>
          </div>

          <div className="ready">
            <FaCircleCheck /> Ready
          </div>
        </div>

        <div className="player">
          <div>😀 Waiting Player...</div>

          <div className="waiting">Waiting...</div>
        </div>

        <div className="row mt-4 g-3">
          <div className="col-md-4">
            <div className="section-title">Category</div>

            <select className="form-select">
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

            <select className="form-select">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div className="col-md-4">
            <div className="section-title">Rounds</div>

            <select className="form-select" defaultValue="3">
              <option>1 Round</option>
              <option value="3">3 Rounds</option>
              <option>5 Rounds</option>
            </select>
          </div>
        </div>

        <div className="row mt-4 g-3">
          <div className="col-6">
            <button className="btn btn-leave w-100">
              <FaArrowRightFromBracket /> Leave
            </button>
          </div>

          <div className="col-6">
            <button className="btn btn-ready w-100">
              <FaCircleCheck /> Ready
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
