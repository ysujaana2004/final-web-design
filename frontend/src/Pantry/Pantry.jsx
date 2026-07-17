import { useEffect, useState } from "react";
import {
  createPantryItem,
  deletePantryItem,
  getPantryItems,
} from "../lib/api";

export default function Pantry() {
  const [pantryItems, setPantryItems] = useState([]);
  const [ingredient, setIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadPantryItems() {
    try {
      setLoading(true);
      setError("");

      const result = await getPantryItems();
      setPantryItems(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPantryItems();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!ingredient.trim()) {
      setError("Ingredient is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createPantryItem({
        ingredient,
        quantity: quantity || null,
        unit: unit || null,
      });

      setIngredient("");
      setQuantity("");
      setUnit("");
      await loadPantryItems();
    } catch (err) {
      if (err.message.includes("pantry_items_user_ingredient_unique")) {
        setError("That ingredient is already in your pantry.");
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      setError("");
      await deletePantryItem(id);
      await loadPantryItems();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <h1>Smart Pantry</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={ingredient}
          onChange={(event) => setIngredient(event.target.value)}
          placeholder="Ingredient"
        />

        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Quantity"
        />

        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          placeholder="Unit"
        />

        <button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add Ingredient"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading pantry...</p>
      ) : pantryItems.length === 0 ? (
        <p>No pantry items yet.</p>
      ) : (
        <ul>
          {pantryItems.map((item) => (
            <li key={item.id}>
              {item.ingredients?.name}
              {item.quantity ? ` - ${item.quantity}` : ""}
              {item.unit ? ` ${item.unit}` : ""}

              <button type="button" onClick={() => handleDelete(item.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
