import { Routes, Route } from "react-router-dom";
import Navbar from "../Navbar/Navbar.jsx";
import Home from "../Home/Home.jsx";
import Recipes from "../Recipes/Recipies.jsx";
import Pantry from "../Pantry/Pantry.jsx";
import Login from "../Login/Login.jsx";
import GroceryList from "../Grocery List/GroceryList.jsx";
import Dashboard from "../Dashboard/DashboardChart.jsx";


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/login" element={<Login />} />
        <Route path="/grocery" element={<GroceryList />} />
        <Route path="/dashboard" element={<Dashboard />} />

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
