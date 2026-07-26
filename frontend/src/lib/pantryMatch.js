export function normalizeIngredientName(name) {
  return (name || "").trim().toLowerCase();
}

export function getRecipeIngredientName(recipeIngredient) {
  return recipeIngredient.ingredients?.name || recipeIngredient.raw_text || "";
}

export function buildPantryMatchKeys(pantryItems) {
  const keys = new Set();

  for (const item of pantryItems) {
    if (item.ingredient_id) {
      keys.add(`id:${item.ingredient_id}`);
    }

    const name = normalizeIngredientName(item.ingredients?.name);
    if (name) {
      keys.add(`name:${name}`);
    }
  }

  return keys;
}

export function isIngredientInPantry(recipeIngredient, pantryMatchKeys) {
  if (
    recipeIngredient.ingredient_id &&
    pantryMatchKeys.has(`id:${recipeIngredient.ingredient_id}`)
  ) {
    return true;
  }

  const name = normalizeIngredientName(getRecipeIngredientName(recipeIngredient));
  return name ? pantryMatchKeys.has(`name:${name}`) : false;
}
