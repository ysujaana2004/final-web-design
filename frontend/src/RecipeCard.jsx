import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPantryItems, getRecipeById } from "./lib/api";
import { buildPantryMatchKeys, isIngredientInPantry } from "./lib/pantryMatch";
import "./RecipeCard.css";

function getIngredientText(recipeIngredient) {
    return (
        recipeIngredient.raw_text ||
        recipeIngredient.ingredients?.name ||
        "Unnamed ingredient"
    );
}

export default function RecipeCard() {
    const { id } = useParams();
    const [recipe, setRecipe] = useState(null);
    const [pantryMatchKeys, setPantryMatchKeys] = useState(new Set());
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [recipeResult, pantryResult] = await Promise.all([
                    getRecipeById(id),
                    getPantryItems(),
                ]);
                if (!cancelled) {
                    setRecipe(recipeResult.data);
                    setPantryMatchKeys(buildPantryMatchKeys(pantryResult.data || []));
                }
            } catch (e) {
                if (!cancelled) setError(e);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    if (error) {
        return (
            <main className="page container">
                Error: {String(error.message || error)}
            </main>
        );
    }
    if (!recipe) {
        return <main className="page container">Loading…</main>;
    }

    return (
        <main className="page container">
            <Link to="/recipes" className="back-link">
                ← Back to Recipes
            </Link>

            <article className="recipe-detail card">
                <header className="recipe-detail__head">
                    <h1 className="recipe-detail__title">{recipe.title}</h1>
                    {recipe.source_url && (
                        <p className="recipe-detail__author">
                            <a href={recipe.source_url} target="_blank" rel="noreferrer">
                                Source video
                            </a>
                        </p>
                    )}
                </header>

                <section className="recipe-detail__section">
                    <h2>Ingredients</h2>
                    <ul className="recipe-detail__list">
                        {(recipe.recipe_ingredients ?? []).map((item) => (
                            <li key={item.id}>
                                {getIngredientText(item)}
                                {isIngredientInPantry(item, pantryMatchKeys) && (
                                    <span className="recipe-detail__have-check" aria-label="Already in your pantry">
                                        {" "}✓
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="recipe-detail__section">
                    <h2>Instructions</h2>
                    {(recipe.instructions ?? []).length ? (
                        <ol className="recipe-detail__list">
                            {recipe.instructions.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ol>
                    ) : (
                        <p className="muted">No instructions provided.</p>
                    )}
                </section>
            </article>
        </main>
    );
}
