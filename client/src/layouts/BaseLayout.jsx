import { Navigate, Outlet, useLocation } from "react-router";

export default function BaseLayout() {
  const location = useLocation();
  const activeGameRoomCode = sessionStorage.getItem("activeGameRoomCode");

  if (!sessionStorage.getItem("username")) {
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
