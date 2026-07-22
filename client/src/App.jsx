import { Navigate, Outlet, Routes, Route, useLocation } from "react-router";
import LandingPage from "./views/LandingPage/LandingPage";
import Home from "./views/HomePage/Home";
import CreateRoom from "./views/CreateRoom/CreateRoom";
import Gameplay from "./views/Gameplay/Gameplay";
import NotFoundPage from "./views/NotFoundPage/NotFoundPage";
import BaseLayout from "./layouts/BaseLayout";
import { useGame } from "./context/GameContext";

function App() {
  return (
    <>
      <Routes>
        <Route element={<GameNavigationGuard />}>
          <Route path="/" element={<LandingPage />} />

          <Route element={<BaseLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/room/:roomCode" element={<CreateRoom />} />
            <Route path="/game/:roomCode" element={<Gameplay />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

function GameNavigationGuard() {
  const location = useLocation();
  const { activeGameRoomCode, username } = useGame();

  if (
    username &&
    activeGameRoomCode &&
    location.pathname !== `/game/${activeGameRoomCode}`
  ) {
    return <Navigate to={`/game/${activeGameRoomCode}`} replace />;
  }

  return <Outlet />;
}

export default App;
