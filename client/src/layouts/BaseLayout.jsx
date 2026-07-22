import { Navigate, Outlet } from "react-router";

export default function BaseLayout() {
  if (!sessionStorage.getItem("username")) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Outlet />
    </>
  );
}
