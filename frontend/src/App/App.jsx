import { Navigate, Routes, Route } from "react-router-dom";
import Navbar from "../Navbar/Navbar.jsx";
import Home from "../Home/Home.jsx";
import Recipes from "../Recipes/Recipies.jsx";
import Pantry from "../Pantry/Pantry.jsx";
import Login from "../Login/Login.jsx";
import GroceryList from "../Grocery List/GroceryList.jsx";
import Dashboard from "../Dashboard/DashboardChart.jsx";
import RecipeCard from "../RecipeCard.jsx";
import NewRecipe from "../NewRecipe.jsx";
import RequireAuth from "../auth/RequireAuth.jsx";
import { useAuth } from "../auth/useAuth";

function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes" element={<RequireAuth><Recipes /></RequireAuth>} />
        <Route path="/recipes/new" element={<RequireAuth><NewRecipe /></RequireAuth>} />
        <Route path="/recipes/:id" element={<RequireAuth><RecipeCard /></RequireAuth>} />
        <Route path="/pantry" element={<RequireAuth><Pantry /></RequireAuth>} />
        <Route path="/login" element={user ? <Navigate to="/recipes" replace /> : <Login />} />
        <Route path="/grocery" element={<RequireAuth><GroceryList /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />

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
