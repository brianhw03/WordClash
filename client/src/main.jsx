import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.jsx";
import GameProvider from "./context/GameContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <GameProvider>
      <App />
    </GameProvider>
  </BrowserRouter>,
);
