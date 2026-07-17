import { useEffect, useState } from "react";
import { getGroceries, getPantryItems, getRecipes } from "../lib/api";

export default function DashboardChart() {
  const [stats, setStats] = useState({
    groceryRecommendations: 0,
    pantryItems: 0,
    recipes: 0,
    topRecommendation: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        setLoading(true);
        setError("");

        const [pantryResult, recipesResult, groceriesResult] =
          await Promise.all([getPantryItems(), getRecipes(), getGroceries()]);
        const groceries = groceriesResult.data || [];

        setStats({
          groceryRecommendations: groceries.length,
          pantryItems: pantryResult.data?.length || 0,
          recipes: recipesResult.data?.length || 0,
          topRecommendation: groceries[0]?.ingredient || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, []);

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <h1>Dashboard</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <div>
          <p>Saved recipes: {stats.recipes}</p>
          <p>Pantry items: {stats.pantryItems}</p>
          <p>Grocery recommendations: {stats.groceryRecommendations}</p>
          <p>
            Top recommendation:{" "}
            {stats.topRecommendation || "No recommendation yet"}
          </p>
        </div>
      )}
    </div>
  );
}
