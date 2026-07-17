import { useEffect, useState } from "react";
import {
  createRecipeFromVideo,
  deleteRecipe,
  getRecipes,
} from "../lib/api";

function getIngredientText(recipeIngredient) {
  return (
    recipeIngredient.raw_text ||
    recipeIngredient.ingredients?.name ||
    "Unnamed ingredient"
  );
}

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadRecipes() {
    try {
      setLoading(true);
      setError("");

      const result = await getRecipes();
      setRecipes(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!videoUrl.trim()) {
      setError("Paste a TikTok or Instagram recipe link.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createRecipeFromVideo(videoUrl);
      setVideoUrl("");
      await loadRecipes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      setError("");
      await deleteRecipe(id);
      await loadRecipes();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <h1>Recipes</h1>

      <form onSubmit={handleSubmit}>
        <input
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="Paste TikTok or Instagram recipe link"
          style={{ minWidth: "320px" }}
        />

        <button type="submit" disabled={saving}>
          {saving ? "Generating..." : "Generate Recipe"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading recipes...</p>
      ) : recipes.length === 0 ? (
        <p>No recipes yet.</p>
      ) : (
        <div>
          {recipes.map((recipe) => (
            <article key={recipe.id} style={{ marginTop: "24px" }}>
              <h2>{recipe.title}</h2>

              {recipe.source_url && (
                <p>
                  <a href={recipe.source_url} target="_blank" rel="noreferrer">
                    Source video
                  </a>
                </p>
              )}

              <h3>Ingredients</h3>
              <ul>
                {(recipe.recipe_ingredients || []).map((ingredient) => (
                  <li key={ingredient.id}>{getIngredientText(ingredient)}</li>
                ))}
              </ul>

              <h3>Instructions</h3>
              <ol>
                {(recipe.instructions || []).map((step, index) => (
                  <li key={`${recipe.id}-step-${index}`}>{step}</li>
                ))}
              </ol>

              <button type="button" onClick={() => handleDelete(recipe.id)}>
                Delete Recipe
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
