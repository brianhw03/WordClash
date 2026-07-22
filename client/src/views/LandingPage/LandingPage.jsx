import "./LandingPage.css";
import Button from "../../components/Button";
import Logo from "../../components/Logo";
import PageBackground from "../../components/PageBackground";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toastSuccess, toastError } from "../../utils/toastify";
import { FaArrowRight } from "react-icons/fa";

export default function LandingPage() {
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!username.trim()) {
        throw new Error("Username is required");
      }

      localStorage.setItem("username", username.trim());

      toastSuccess("Welcome to WordClash!");

      navigate("/home");
    } catch (error) {
      toastError(error.message);
    }
  };

  return (
    <>
      <main className="landing-page">
        <PageBackground />

        <div className="hero-card text-center w-100 mx-auto position-relative">
          <Logo />

          <p className="subtitle mb-3">Multiplayer Word Battle</p>

          <div className="d-flex justify-content-center align-items-center gap-3 steps">
            Think
            <FaArrowRight />
            Guess
            <FaArrowRight />
            Win
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fa-solid fa-user"></i>
              </span>

              <input
                type="text"
                className="form-control"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <Button type="submit">PLAY NOW</Button>
          </form>

          <div className="footer">
            Challenge your friends in hangman battle.
          </div>
        </div>
      </main>
    </>
  );
}
