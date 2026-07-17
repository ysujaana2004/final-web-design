import { useEffect, useState } from "react";
import { getGroceries } from "../lib/api";

export default function GroceryList() {
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadGroceries() {
    try {
      setLoading(true);
      setError("");

      const result = await getGroceries();
      setGroceries(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroceries();
  }, []);

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <h1>Grocery List</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading groceries...</p>
      ) : groceries.length === 0 ? (
        <p>No grocery recommendations yet.</p>
      ) : (
        <ul>
          {groceries.map((item) => (
            <li key={item.ingredient_id || item.ingredient}>
              <strong>{item.ingredient}</strong>
              {" - "}
              unlocks {item.unlock_count}{" "}
              {item.unlock_count === 1 ? "recipe" : "recipes"}

              {item.recipes?.length > 0 && (
                <ul>
                  {item.recipes.map((recipe) => (
                    <li key={recipe.id}>{recipe.title}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
