import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";

import "./DashboardChart.css";
import Addreci from "../Buttons/AddReci.jsx";
import ScanPantry from "../Buttons/ScanPantry.jsx";
import GroceryButton from "../Buttons/GroceryButton.jsx";

// --- MOCK API FUNCTIONS & DATA ---
const mockRecipes = [
  { id: 1, title: "Creamy Tomato Pasta" },
  { id: 2, title: "Spicy Chicken Curry" },
  { id: 3, title: "Garlic Butter Steak" },
];

const mockPantryItems = [
  { id: 1, ingredient_name: "Olive Oil", quantity: 1, unit: "bottle" },
  { id: 2, ingredient_name: "Salt", quantity: 500, unit: "g" },
  { id: 3, ingredient_name: "Black Pepper", quantity: 100, unit: "g" },
];

const mockRecommendations = [
  { id: "milk", label: "Whole milk (1 gal)" },
  { id: "eggs", label: "Eggs (dozen)" },
  { id: "bread", label: "Whole wheat bread" }
];

const getAllRecipes = async () => {
  return new Promise((resolve) => setTimeout(() => resolve(mockRecipes), 500));
};

const getPantryItems = async () => {
  return new Promise((resolve) => setTimeout(() => resolve(mockPantryItems), 500));
};

const getRecommendations = async () => {
  return new Promise((resolve) => setTimeout(() => resolve(mockRecommendations), 500));
};
// ---------------------------------

export default function Dashboard() {
  const username = "Osama";
  const [recipes, setRecipes] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [recipeData, pantryData, recommendationData] = await Promise.all([
        getAllRecipes({ signal }),
        getPantryItems({ signal }),
        getRecommendations(),
      ]);
      setRecipes(Array.isArray(recipeData) ? recipeData : []);
      setPantryItems(Array.isArray(pantryData) ? pantryData : []);
      setRecommendations(Array.isArray(recommendationData) ? recommendationData : []);
      setError(null);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refreshRecommendations = useCallback(async () => {
    try {
      const recs = await getRecommendations();
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (err) {
      console.error("Failed to refresh recommendations", err);
    }
  }, []);

  const handleRecipeCreated = useCallback(
    (recipe) => {
      if (!recipe) return;
      setRecipes((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)]);
      refreshRecommendations();
    },
    [refreshRecommendations]
  );

  const recentRecipes = recipes.slice(0, 3);
  const pantryPreview = pantryItems.slice(0, 3);

  return (
    <main className="dashboard">
      <section className="dash-section dash-hero">
        <h1 className="dash-title">Welcome back, {username}</h1>
        <p className="dash-subtitle">
          Here's a quick look at your cooking world today.
        </p>
        {error && (
          <p className="dash-error">
            {error?.message || "Failed to load dashboard data."}
          </p>
        )}

        <div className="dash-quick-actions">
          <div className="navbar__actions">
            <Addreci onRecipeCreated={handleRecipeCreated} />
          </div>
          <div className="navbar__actions">
            <Link to="/pantry">
              <ScanPantry />
            </Link>
          </div>
          <div className="navbar__actions">
            <Link to="/grocery">
              <GroceryButton />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Stats Section ===== */}
      <section className="dash-section dash-stats">
        <div className="dash-card">
          <h3>📘 Recipes</h3>
          <p className="dash-number">
            {loading ? "…" : `${recipes.length} Saved`}
          </p>
        </div>

        <div className="dash-card">
          <h3>🧰 Pantry Items</h3>
          <p className="dash-number">
            {loading ? "…" : `${pantryItems.length} Items`}
          </p>
        </div>

        <div className="dash-card">
          <h3>🛒 Grocery Needed</h3>
          <p className="dash-number">
            {loading ? "…" : `${recommendations.length} Items`}
          </p>
        </div>
      </section>

      {/* ===== Recent Recipes ===== */}
      <section className="dash-section">
        <h2 className="dash-heading">Recent Recipes</h2>

        <div className="dash-list">
          {loading ? (
            <p className="muted">Loading recipes…</p>
          ) : recentRecipes.length ? (
            recentRecipes.map((recipe) => (
              <div className="dash-list-item" key={recipe.id ?? recipe.title}>
                <p>{recipe.title}</p>
                {recipe.id && (
                  <Link to={`/recipes/${recipe.id}`} className="dash-link">
                    View
                  </Link>
                )}
              </div>
            ))
          ) : (
            <p className="muted">No recipes yet. Add your first one!</p>
          )}
        </div>
      </section>

      {/* ===== Pantry Overview ===== */}
      <section className="dash-section">
        <h2 className="dash-heading">Pantry Overview</h2>

        <div className="dash-list">
          {loading ? (
            <p className="muted">Loading pantry…</p>
          ) : pantryPreview.length ? (
            pantryPreview.map((item) => (
              <div className="dash-list-item" key={item.id ?? item.ingredient_name}>
                <p>{item.ingredient_name}</p>
                <span className="dash-tag">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No pantry items yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
