import { useState } from "react";
import { toastError } from "../utils/toastify";

export default function JoinRoomModal({ show, onClose, onJoin }) {
  const [roomCode, setRoomCode] = useState("");

  const handleJoin = () => {
    if (roomCode.trim().length !== 6) {
      toastError("Room code must contain 6 characters");
      return;
    }

    onJoin?.(roomCode.trim());
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}></div>

      <div className="join-modal-wrapper">
        <div
          className="join-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-room-title"
        >

          <div className="join-modal-header">
            <h4 id="join-room-title">Join Room</h4>
          </div>

          <div className="join-modal-body">
            <p>Enter the room code</p>

            <input
              type="text"
              maxLength={6}
              className="room-input"
              placeholder="Room Code (e.g. ABC123)"
              value={roomCode}
              autoFocus
              aria-label="Room code"
              onChange={(e) =>
                setRoomCode(e.target.value.toUpperCase())
              }
            />
          </div>

          <div className="join-modal-footer">

            <button
              className="cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="join-btn"
              onClick={handleJoin}
            >
              Join Room
            </button>

          </div>

        </div>
      </div>
    </>
  );
}
