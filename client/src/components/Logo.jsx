import { FaGamepad, FaArrowRight } from "react-icons/fa";

export default function Logo() {
  return (
    <>
      <div className="logo d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4">
        <FaGamepad />
      </div>

      <h1 className="display-4 fw-bold title-game">WORDCLASH</h1>

      <p className="subtitle mb-3">Multiplayer Word Battle</p>

      <div className="d-flex justify-content-center align-items-center gap-3 steps">
        Think
        <FaArrowRight />
        Guess
        <FaArrowRight />
        Win
      </div>
    </>
  );
}
