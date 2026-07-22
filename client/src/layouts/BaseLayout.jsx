import { Navigate, Outlet, useLocation } from "react-router";
import { useGame } from "../context/GameContext";

export default function BaseLayout() {
  const location = useLocation();
  const { activeGameRoomCode, username } = useGame();

  if (!username) {
    return <Navigate to="/" replace />;
  }

  if (
    activeGameRoomCode &&
    location.pathname !== `/game/${activeGameRoomCode}`
  ) {
    return <Navigate to={`/game/${activeGameRoomCode}`} replace />;
  }

  return (
    <>
      <Outlet />
    </>
  );
}
