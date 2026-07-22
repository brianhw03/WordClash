import "./Gameplay.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaGamepad, FaSkull, FaTrophy } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router";

import PageBackground from "../../components/PageBackground";
import { socket } from "../../lib/socket";
import { toastError } from "../../utils/toastify";
import { useGame } from "../../context/GameContext";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export default function Gameplay() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const {
    playerId,
    username,
    room,
    setRoom,
    setActiveGame,
    clearActiveGame,
  } = useGame();
  const [guessedKeys, setGuessedKeys] = useState({});
  const [gameOver, setGameOver] = useState(null);
  const [roundEnd, setRoundEnd] = useState(null);
  const [roundCountdown, setRoundCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRequestedRematch, setOpponentRequestedRematch] = useState(false);
  const [opponentLeftCountdown, setOpponentLeftCountdown] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);

  useEffect(() => {
    const updateRoom = (updatedRoom) => {
      if (updatedRoom.code === roomCode) setRoom(updatedRoom);
    };

    const handleGameOver = (result) => {
      setGameOver(result);
      setRematchRequested(false);
      setOpponentRequestedRematch(false);
    };
    const handleRematch = () => {
      clearActiveGame();
      navigate(`/room/${roomCode}`);
    };
    const restoreFinishedGame = (updatedRoom) => {
      if (updatedRoom.status !== "finished") return;

      const winner = updatedRoom.players.find((player) => player.id === updatedRoom.winner);
      setGameOver({ winnerId: updatedRoom.winner, winner: winner?.name || null });
    };
    const handleRematchStatus = ({ requestedPlayerIds }) => {
      setRematchRequested(requestedPlayerIds.includes(playerId));
      setOpponentRequestedRematch(requestedPlayerIds.some((id) => id !== playerId));
    };
    const handleRematchCancelled = ({ countdown }) => setOpponentLeftCountdown(countdown);
    const handleTimer = ({ remaining }) => setTimeLeft(remaining);
    const handleRoundEnd = (result) => {
      setRoundEnd(result);
      if (!result.matchOver) setRoundCountdown(3);
    };
    const handleRoundStart = () => {
      setGuessedKeys({});
      setRoundEnd(null);
      setRoundCountdown(null);
      setTimeLeft(45);
    };

    socket.on("room:updated", updateRoom);
    socket.on("game:updated", updateRoom);
    socket.on("game:over", handleGameOver);
    socket.on("game:timer", handleTimer);
    socket.on("round:ended", handleRoundEnd);
    socket.on("game:started", handleRoundStart);
    socket.on("game:rematch", handleRematch);
    socket.on("game:rematch-status", handleRematchStatus);
    socket.on("game:rematch-cancelled", handleRematchCancelled);

    const joinRoom = () => socket.emit(
      "room:join",
      { code: roomCode, name: username, playerId },
      (result) => {
        if (result.error) {
          toastError(result.error);
          navigate("/home");
          return;
        }
        if (result.room.status !== "waiting") {
          setActiveGame(roomCode);
        }
        setRoom(result.room);
        restoreFinishedGame(result.room);
      },
    );

    socket.emit("room:get", { code: roomCode }, (result) => {
      if (result.error) {
        toastError(result.error);
        navigate("/home");
        return;
      }

      const player = result.room.players.find((candidate) => candidate.id === playerId);
      if (player?.connected) {
        if (result.room.status !== "waiting") {
          setActiveGame(roomCode);
        }
        setRoom(result.room);
        restoreFinishedGame(result.room);
      }
      else joinRoom();
    });

    return () => {
      socket.off("room:updated", updateRoom);
      socket.off("game:updated", updateRoom);
      socket.off("game:over", handleGameOver);
      socket.off("game:timer", handleTimer);
      socket.off("round:ended", handleRoundEnd);
      socket.off("game:started", handleRoundStart);
      socket.off("game:rematch", handleRematch);
      socket.off("game:rematch-status", handleRematchStatus);
      socket.off("game:rematch-cancelled", handleRematchCancelled);
    };
  }, [clearActiveGame, navigate, playerId, roomCode, setActiveGame, setRoom, username]);

  useEffect(() => {
    if (!room?.roundEndsAt) return undefined;

    const updateTimer = () => {
      setTimeLeft(Math.max(0, Math.ceil((room.roundEndsAt - Date.now()) / 1000)));
    };
    updateTimer();
    const timer = setInterval(updateTimer, 500);
    return () => clearInterval(timer);
  }, [room?.roundEndsAt]);

  useEffect(() => {
    if (!roundEnd || roundEnd.matchOver) return undefined;

    const countdown = setInterval(() => {
      setRoundCountdown((seconds) => (seconds && seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    return () => clearInterval(countdown);
  }, [roundEnd]);

  useEffect(() => {
    if (opponentLeftCountdown === null) return undefined;

    const timer = setTimeout(() => {
      if (opponentLeftCountdown <= 1) {
        clearActiveGame();
        navigate("/home");
      } else setOpponentLeftCountdown((seconds) => seconds - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [clearActiveGame, navigate, opponentLeftCountdown]);

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.id === playerId),
    [playerId, room],
  );
  const opponent = useMemo(
    () => room?.players.find((player) => player.id !== playerId),
    [playerId, room],
  );
  const maskedWord = currentPlayer?.maskedWord || "";
  const lifeExhausted = Boolean(
    currentPlayer && currentPlayer.lives <= 0 && room?.status === "playing",
  );

  const handleGuess = useCallback((letter) => {
    if (
      !currentPlayer ||
      currentPlayer.lives <= 0 ||
      guessedKeys[letter] ||
      room?.status !== "playing"
    ) return;

    socket.emit("game:guess", { code: roomCode, playerId, letter }, (result) => {
      if (result?.error) {
        toastError(result.error);
        return;
      }

      setGuessedKeys((keys) => ({
        ...keys,
        [letter]: result.correct ? "correct" : "wrong",
      }));
    });
  }, [currentPlayer, guessedKeys, playerId, room?.status, roomCode]);

  const handleShowHint = () => {
    socket.emit("game:hint", { code: roomCode, playerId }, (result) => {
      if (result?.error) toastError(result.error);
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const letter = event.key.toUpperCase();
      if (!event.repeat && !lifeExhausted && /^[A-Z]$/.test(letter)) {
        setPressedKey(letter);
        setTimeout(() => setPressedKey(null), 180);
        handleGuess(letter);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleGuess, lifeExhausted]);

  const handleBackHome = () => {
    socket.emit("room:leave", { code: roomCode, playerId }, () => {
      clearActiveGame();
      navigate("/home");
    });
  };

  const handleRematch = () => {
    socket.emit("game:rematch", { code: roomCode, playerId }, (result) => {
      if (result.error) toastError(result.error);
      else setRematchRequested(true);
    });
  };

  const playerWrongGuesses = currentPlayer ? 6 - currentPlayer.lives : 0;
  const opponentWrongGuesses = opponent ? 6 - opponent.lives : 0;
  const didWin = gameOver?.winnerId === playerId;
  const didLose = Boolean(gameOver?.winnerId) && !didWin;

  return (
    <main className="gameplay-page">
      <PageBackground />

      <div className="game-container">
        <section className="game-card">
          <header className="game-header">
            <div className="game-logo">
              <div className="game-logo-circle"><FaGamepad /></div>
              <div>
                <h2>WORDCLASH</h2>
                <small>Multiplayer Hangman</small>
              </div>
            </div>
            <div className="timer-box game-timer"><small>TIME</small><strong>{timeLeft}s</strong></div>
            <div className="game-meta">
              <div className="category-box"><small>CATEGORY</small><strong>{room?.category || "Animal"}</strong></div>
              <div className="round-box"><small>ROUND</small><strong>{room?.currentRound || 1} / {room?.rounds || 3}</strong></div>
            </div>
          </header>

          <div className="scoreboard">
            <PlayerScore player={currentPlayer} align="left" label="You" />
            <div className="vs">VS</div>
            <PlayerScore player={opponent} align="right" />
          </div>

          <section className="word-section">
            <div className="word">
              {maskedWord.split(" ").map((wordPart, wordIndex) => (
                <div className="word-group" key={`${wordPart}-${wordIndex}`}>
                  {[...wordPart].map((letter, letterIndex) => (
                    /[A-Z_]/.test(letter) ? (
                      <div className={`word-box ${letter !== "_" ? "active" : ""}`} key={`${letter}-${letterIndex}`}>
                        {letter === "_" ? "" : letter}
                      </div>
                    ) : (
                      <span className="word-separator" key={`${letter}-${letterIndex}`}>{letter}</span>
                    )
                  ))}
                </div>
              ))}
            </div>
            <div className="hint-section">
              {room?.hint ? (
                <p><strong>Shared Hint:</strong> {room.hint}</p>
              ) : (
                <button
                  className="hint-btn"
                  type="button"
                  onClick={handleShowHint}
                  disabled={room?.status !== "playing" || !room?.hintAvailable}
                >
                  Show Shared Hint
                </button>
              )}
            </div>
          </section>

          <section className="hangman-wrapper">
            <HangmanCard name={currentPlayer?.name || "You"} wrongGuesses={playerWrongGuesses} />
            <HangmanCard name={opponent?.name || "Waiting Player"} wrongGuesses={opponentWrongGuesses} />
          </section>

          <div className="keyboard">
            {KEYBOARD_ROWS.map((row) => (
              <div className="keyboard-row" key={row}>
                {[...row].map((letter) => (
                  <button
                    className={`key ${guessedKeys[letter] || ""} ${pressedKey === letter ? "pressed" : ""} ${lifeExhausted ? "locked" : ""}`}
                    disabled={Boolean(guessedKeys[letter]) || room?.status !== "playing" || lifeExhausted}
                    key={letter}
                    onClick={() => handleGuess(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <p className="game-status">Guess the word before your opponent!</p>
        </section>
      </div>

      {gameOver && (
        <div className="winner-overlay">
          <div className="winner-card">
            {didLose ? <FaSkull className="loser-icon" /> : <FaTrophy />}
            <h2>{didLose ? `${currentPlayer?.name} Lose!` : gameOver.winner ? `${gameOver.winner} Wins!` : "It's a Draw!"}</h2>
            <p>{didLose ? "Try Again" : gameOver.winner ? "Congratulations!" : "The match ended in a draw."}</p>
            {opponentLeftCountdown !== null ? (
              <div className="countdown">Opponent returned home. Redirecting in {opponentLeftCountdown}</div>
            ) : rematchRequested ? (
              <div className="countdown">Rematch requested. Waiting for opponent...</div>
            ) : opponentRequestedRematch ? (
              <>
                <div className="rematch-invitation">{opponent?.name || "Your opponent"} invited you to a rematch.</div>
                <div className="game-over-actions">
                  <button className="back-home-btn" onClick={handleBackHome}>Back to Home</button>
                  <button className="rematch-btn" onClick={handleRematch}>Accept Rematch</button>
                </div>
              </>
            ) : (
              <div className="game-over-actions">
                <button className="back-home-btn" onClick={handleBackHome}>Back to Home</button>
                <button className="rematch-btn" onClick={handleRematch}>Rematch</button>
              </div>
            )}
          </div>
        </div>
      )}

      {roundEnd && !roundEnd.matchOver && (
        <div className="winner-overlay">
          <div className="winner-card">
            <FaTrophy />
            <h2>{roundEnd.winner ? `${roundEnd.winner} wins the round!` : "Round Draw"}</h2>
            <p>The word was <strong>{roundEnd.word}</strong></p>
            <div className="countdown">Next round starts in {roundCountdown ?? 3}</div>
          </div>
        </div>
      )}

      {lifeExhausted && !roundEnd && !gameOver && (
        <div className="winner-overlay">
          <div className="winner-card life-exhausted-card">
            <FaSkull className="loser-icon" />
            <h2>Out of Lives!</h2>
            <p>You have used all of your guessing attempts.</p>
            <div className="countdown">Waiting for {opponent?.name || "User2"} to finish the round...</div>
          </div>
        </div>
      )}
    </main>
  );
}

function PlayerScore({ player, align, label }) {
  return (
    <div className={`game-player ${align}`}>
      <div className="player-name">{label ? `${label}: ` : ""}{player?.name || "Waiting..."}</div>
      <div className="player-score">★ {player?.score || 0}</div>
    </div>
  );
}

function HangmanCard({ name, wrongGuesses }) {
  return (
    <div className="hangman-card">
      <div className="hangman-title">{name}</div>
      <div
        className="hangman-stage"
        aria-label={`${wrongGuesses} wrong guesses`}
      >
        <HangmanFigure stage={Math.min(wrongGuesses, 6)} />
      </div>
      <div className="life-text">Wrong Guess: {wrongGuesses} / 6</div>
    </div>
  );
}

function HangmanFigure({ stage }) {
  return (
    <svg className="hangman-figure" viewBox="0 0 200 280" role="img" aria-label="Hangman stage">
      <g className="gallows">
        <path d="M28 256 H178 M58 256 V28 H148 M58 58 L92 28 M142 28 V58" />
      </g>
      {stage >= 1 && <circle className="hangman-part" cx="142" cy="73" r="15" />}
      {stage >= 2 && <path className="hangman-part" d="M142 88 V145" />}
      {stage >= 3 && <path className="hangman-part" d="M142 105 L112 128" />}
      {stage >= 4 && <path className="hangman-part" d="M142 105 L172 128" />}
      {stage >= 5 && <path className="hangman-part" d="M142 145 L119 185" />}
      {stage >= 6 && <path className="hangman-part" d="M142 145 L165 185" />}
    </svg>
  );
}
