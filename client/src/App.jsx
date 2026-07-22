import { Routes, Route } from "react-router";
import LandingPage from "./views/LandingPage/LandingPage";
import Home from "./views/HomePage/Home";
import CreateRoom from "./views/CreateRoom/CreateRoom";
import BaseLayout from "./layouts/BaseLayout";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<BaseLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/room/:roomCode" element={<CreateRoom />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
