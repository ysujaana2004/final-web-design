const { supabase } = require("../lib/db");
const { normalizeIngredientName } = require("../lib/ingredients");

const PANTRY_INGREDIENT_SELECT = `
  ingredient_id,
  ingredients (
    name
  )
`;

const RECIPE_INGREDIENTS_SELECT = `
  id,
  title,
  recipe_ingredients (
    ingredient_id,
    raw_text,
    ingredients (
      name
    )
  )
`;

function getIngredientName(ingredientsRelation) {
  if (Array.isArray(ingredientsRelation)) {
    return typeof ingredientsRelation[0]?.name === "string"
      ? ingredientsRelation[0].name
      : "";
  }

  return typeof ingredientsRelation?.name === "string"
    ? ingredientsRelation.name
    : "";
}

function buildPantryMatchKeys(pantryItems = []) {
  const pantryMatchKeys = new Set();

  for (const pantryItem of pantryItems) {
    const ingredientId = pantryItem?.ingredient_id || "";
    const ingredientName = normalizeIngredientName(
      getIngredientName(pantryItem?.ingredients)
    );

    if (ingredientId) {
      pantryMatchKeys.add(`id:${ingredientId}`);
    }

    if (ingredientName) {
      pantryMatchKeys.add(`name:${ingredientName}`);
    }
  }

  return pantryMatchKeys;
}

// Every missing ingredient is kept (so the grocery list is complete), but each
// entry is tagged with whether it was the *only* thing missing from that
// recipe. Only sole-missing entries count toward "unlock_count" below, so an
// ingredient can show up on the list with a low/zero unlock count if it's
// always missing alongside other ingredients.
function findMissingIngredients(recipes = [], pantryMatchKeys = new Set()) {
  const missingIngredients = [];

  for (const recipe of recipes) {
    const missingForRecipe = [];
    const seenMatchKeys = new Set();

    for (const recipeIngredient of recipe.recipe_ingredients || []) {
      const ingredientId = recipeIngredient?.ingredient_id || null;
      const ingredientName = getIngredientName(recipeIngredient?.ingredients)
        || normalizeIngredientName(recipeIngredient?.raw_text);
      const matchKey = ingredientId
        ? `id:${ingredientId}`
        : ingredientName
          ? `name:${ingredientName}`
          : "";

      if (!matchKey || seenMatchKeys.has(matchKey)) {
        continue;
      }

      seenMatchKeys.add(matchKey);

      if (!pantryMatchKeys.has(matchKey)) {
        missingForRecipe.push({ ingredientId, ingredientName });
      }
    }

    const wouldUnlockRecipe = missingForRecipe.length === 1;

    for (const missing of missingForRecipe) {
      missingIngredients.push({
        ingredientId: missing.ingredientId,
        ingredientName: missing.ingredientName,
        recipe: {
          id: recipe.id,
          title: recipe.title
        },
        wouldUnlockRecipe
      });
    }
  }

  return missingIngredients;
}

function rankGroceries(missingIngredients = []) {
  const groceriesByIngredient = new Map();

  for (const item of missingIngredients) {
    const normalizedName = normalizeIngredientName(item.ingredientName);
    const ingredientKey = item.ingredientId
      ? `id:${item.ingredientId}`
      : normalizedName
        ? `name:${normalizedName}`
        : "";

    if (!ingredientKey) {
      continue;
    }

    if (!groceriesByIngredient.has(ingredientKey)) {
      groceriesByIngredient.set(ingredientKey, {
        ingredient_id: item.ingredientId,
        ingredient: item.ingredientName || normalizedName,
        recipes: [],
        recipeIds: new Set(),
        // Tracks every recipe this ingredient is missing from, regardless of
        // whether buying it alone would complete that recipe.
        allRecipeIds: new Set()
      });
    }

    const grocery = groceriesByIngredient.get(ingredientKey);

    grocery.allRecipeIds.add(item.recipe.id);

    if (item.wouldUnlockRecipe && !grocery.recipeIds.has(item.recipe.id)) {
      grocery.recipeIds.add(item.recipe.id);
      grocery.recipes.push(item.recipe);
    }
  }

  return Array.from(groceriesByIngredient.values())
    .map((grocery) => ({
      ingredient_id: grocery.ingredient_id,
      ingredient: grocery.ingredient,
      unlock_count: grocery.recipes.length,
      recipe_count: grocery.allRecipeIds.size,
      recipes: grocery.recipes
    }))
    .sort((left, right) => {
      if (right.unlock_count !== left.unlock_count) {
        return right.unlock_count - left.unlock_count;
      }

      if (right.recipe_count !== left.recipe_count) {
        return right.recipe_count - left.recipe_count;
      }

      return left.ingredient.localeCompare(right.ingredient);
    });
}

async function fetchPantryItems(userId, database = supabase) {
  const { data, error } = await database
    .from("pantry_items")
    .select(PANTRY_INGREDIENT_SELECT)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data || [];
}

async function fetchRecipesWithIngredients(userId, database = supabase) {
  const { data, error } = await database
    .from("recipes")
    .select(RECIPE_INGREDIENTS_SELECT)
    .eq("created_by", userId);

  if (error) {
    throw error;
  }

  return data || [];
}

async function buildGroceriesForUser(userId, database = supabase) {
  const [pantryItems, recipes] = await Promise.all([
    fetchPantryItems(userId, database),
    fetchRecipesWithIngredients(userId, database)
  ]);

  const pantryMatchKeys = buildPantryMatchKeys(pantryItems);
  const missingIngredients = findMissingIngredients(recipes, pantryMatchKeys);

  return rankGroceries(missingIngredients);
}

module.exports = {
  buildGroceriesForUser,
  buildPantryMatchKeys,
  fetchPantryItems,
  fetchRecipesWithIngredients,
  findMissingIngredients,
  rankGroceries
};