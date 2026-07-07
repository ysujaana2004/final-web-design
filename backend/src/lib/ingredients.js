function normalizeIngredientName(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function resolveOrCreateIngredientId(ingredientName, database) {
  const normalizedIngredient = normalizeIngredientName(ingredientName);

  if (!normalizedIngredient) {
    throw new Error("ingredient is required");
  }

  const { data: existingIngredient, error: lookupError } = await database
    .from("ingredients")
    .select("id")
    .eq("name", normalizedIngredient)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingIngredient?.id) {
    return existingIngredient.id;
  }

  const { data: createdIngredient, error: createError } = await database
    .from("ingredients")
    .insert({
      name: normalizedIngredient
    })
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }

  return createdIngredient.id;
}

module.exports = {
  normalizeIngredientName,
  resolveOrCreateIngredientId
};
