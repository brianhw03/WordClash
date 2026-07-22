import { useState } from "react";

export default function JoinRoomModal({ show, onClose }) {
  const [roomCode, setRoomCode] = useState("");

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}></div>

      <div className="join-modal-wrapper">
        <div className="join-modal">

          <div className="join-modal-header">
            <h4>Join Room</h4>
          </div>

          <div className="join-modal-body">
            <p>Enter the room code</p>

            <input
              type="text"
              maxLength={6}
              className="room-input"
              placeholder="Room Code (e.g. ABC123)"
              value={roomCode}
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
            >
              Join Room
            </button>

          </div>

        </div>
      </div>
    </>
  );
}