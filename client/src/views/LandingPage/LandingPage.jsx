import "./LandingPage.css";
export default function LandingPage() {
  return (
    <>
      <>
        <div className="blur one" />
        <div className="blur two" />
        <div className="letters">
          <span>A</span>
          <span>B</span>
          <span>C</span>
          <span>D</span>
          <span>?</span>
          <span>#</span>
        </div>
        <div className="hangman">☠</div>
        <div
          className="hero-card text-center w-100 mx-auto position-relative"
          style={{
            maxWidth: 500,
            padding: 50,
            borderRadius: 28,
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            className="logo d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
            style={{
              width: 90,
              height: 90,
              background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
              fontSize: 38,
              boxShadow: "0 10px 30px rgba(99, 102, 241, 0.45)",
            }}
          >
            <i className="fa-solid fa-gamepad" />
          </div>
          <h1 className="display-4 fw-bold title-game">WORDCLASH</h1>
          <p className="subtitle mb-3">Multiplayer Word Battle</p>
          <div className="d-flex justify-content-center align-items-center gap-3 steps">
            Think
            <i className="fa-solid fa-arrow-right" />
            Guess
            <i className="fa-solid fa-arrow-right" />
            Win
          </div>
          <form>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fa-solid fa-user" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your username"
              />
            </div>
            <button className="btn btn-primary w-100 btn-play">PLAY NOW</button>
          </form>
          <div className="footer">
            Challenge your friends in hangman battle.
          </div>
        </div>
      </>
    </>
  );
}
