import { Routes, Route } from "react-router-dom";
import Navbar from "../Navbar/Navbar.jsx";
import Home from "../Home/Home.jsx";
import Recipes from "../Recipes/Recipies.jsx";
import Pantry from "../Pantry/Pantry.jsx";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route
          path="*"
          element={
            <div className="container" style={{ padding: "32px 20px" }}>
              Page not found.
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
