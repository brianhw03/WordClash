import { FaGamepad } from "react-icons/fa";

export default function Logo() {
  return (
    <>
      <div className="logo d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4">
        <FaGamepad />
      </div>

      <h1 className="display-4 fw-bold title-game">WORDCLASH</h1>
    </>
  );
}
