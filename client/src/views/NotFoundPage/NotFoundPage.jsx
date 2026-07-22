import { Navigate } from "react-router";

import { useGame } from "../../context/GameContext";

export default function NotFoundPage() {
  const { username } = useGame();
  return <Navigate replace to={username ? "/home" : "/"} />;
}
