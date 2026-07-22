import { Routes, Route } from "react-router";
import LandingPage from "./views/LandingPage/LandingPage";
import Home from "./views/HomePage/Home";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </>
  );
}

export default App;
