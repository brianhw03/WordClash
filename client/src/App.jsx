import { Routes, Route } from "react-router";
import LandingPage from "./views/LandingPage/LandingPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/wordclash" element={<LandingPage />} />
        <Route path="/wordclash" element={<LandingPage />} />
      </Routes>
    </>
  );
}

export default App;
