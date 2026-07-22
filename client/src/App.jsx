import { Routes, Route } from "react-router";
import LandingPage from "./views/LandingPage/LandingPage";
import Home from "./views/HomePage/Home";
import CreateRoom from "./views/CreateRoom/CreateRoom";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/room" element={<CreateRoom />} />
      </Routes>
    </>
  );
}

export default App;
