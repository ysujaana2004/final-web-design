import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Recipies.css"
import Addreci from "../Buttons/AddReci.jsx";
import Footer from "../Footer/Footer.jsx";
import { deleteRecipe, getPantryItems, getRecipes } from "../lib/api";
import { buildPantryMatchKeys, isIngredientInPantry } from "../lib/pantryMatch";

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [pantryMatchKeys, setPantryMatchKeys] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadRecipes() {
    try {
      setLoading(true);
      setError(null);

      const [recipeResult, pantryResult] = await Promise.all([
        getRecipes(),
        getPantryItems(),
      ]);
      setRecipes(recipeResult.data || []);
      setPantryMatchKeys(buildPantryMatchKeys(pantryResult.data || []));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  async function handleDelete(id) {
    try {
      setError(null);
      await deleteRecipe(id);
      await loadRecipes();
    } catch (e) {
      setError(e);
    }
  }

  const sortedRecipes = [...recipes].sort((left, right) => {
    const leftCompletion = getCompletionRatio(left, pantryMatchKeys);
    const rightCompletion = getCompletionRatio(right, pantryMatchKeys);

    if (leftCompletion !== rightCompletion) {
      return rightCompletion - leftCompletion;
    }

    const leftTotal = (left.recipe_ingredients ?? []).length;
    const rightTotal = (right.recipe_ingredients ?? []).length;

    if (leftTotal !== rightTotal) {
      return leftTotal - rightTotal;
    }

    return (left.title || "").localeCompare(right.title || "");
  });

  return (
    <main className="page">
      {/* Page header and Search combined */}
      <div
        className="page__head container">
        {/* LEFT SIDE: Title, Subtitle, and CTA Button */}

        <div>
          <h1 className="page__title">Recipe Collection</h1>
          <p className="page__subtitle">
            Discover and share recipes transcribed from your audio/video.
          </p>
        </div>
        <div className="navbar__actions">
          <Addreci onRecipeCreated={loadRecipes} />
        </div>
        <div className="searchbar">
          <input
            className="searchbar__input"
            placeholder="Search recipe titles…"
          />
        </div>
        {/* RIGHT SIDE: Search bar */}
        <section
          style={{ width: '250px', padding: 0, marginTop: '8.0rem' }} // Align search bar visually
        >
        </section>
      </div>



      {/* Grid */}
      <section className="grid grid--recipes">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : error ? (
          <p className="muted">Failed to load: {String(error.message || error)}</p>
        ) : sortedRecipes.length ? (
          sortedRecipes.map((r) => (
            <RecipeTitleCard
              key={r.id ?? r.title}
              recipe={r}
              pantryMatchKeys={pantryMatchKeys}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <p className="muted">No recipes yet.</p>
        )}
      </section>
    </main>
  );
}

function getCompletionRatio(recipe, pantryMatchKeys) {
  const recipeIngredients = recipe.recipe_ingredients ?? [];
  const totalCount = recipeIngredients.length;

  if (totalCount === 0) {
    return 0;
  }

  const missingCount = recipeIngredients.filter((ri) =>
    !isIngredientInPantry(ri, pantryMatchKeys)
  ).length;

  return (totalCount - missingCount) / totalCount;
}

function RecipeTitleCard({ recipe, pantryMatchKeys, onDelete }) {
  const recipeIngredients = recipe.recipe_ingredients ?? [];
  const totalCount = recipeIngredients.length;
  const haveCount = recipeIngredients.filter((ri) =>
    isIngredientInPantry(ri, pantryMatchKeys)
  ).length;

  return (
    <article className="card recipe recipe--minimal">
      <h3 className="recipe__title">
        {recipe.title}{" "}
        <span className="recipe__ingredient-count">
          ({haveCount}/{totalCount})
        </span>
      </h3>
      <div className="recipe__actions">
        <Link to={`/recipes/${recipe.id}`} className="btn btn--ghost sm">
          View Recipe
        </Link>
        <button
          type="button"
          className="btn btn--ghost sm"
          onClick={() => onDelete(recipe.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
