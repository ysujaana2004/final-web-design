const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGroceriesForUser,
  buildPantryMatchKeys,
  findSingleMissingIngredients,
  rankGroceries
} = require("../../src/services/groceries");

test("buildPantryMatchKeys includes both canonical id keys and normalized name keys", () => {
  const pantryMatchKeys = buildPantryMatchKeys([
    {
      ingredient_id: "ingredient-1",
      ingredients: {
        name: "Heavy Cream"
      }
    }
  ]);

  assert.equal(pantryMatchKeys.has("id:ingredient-1"), true);
  assert.equal(pantryMatchKeys.has("name:heavy cream"), true);
});

test("findSingleMissingIngredients dedupes recipe ingredients and keeps only one-away recipes", () => {
  const pantryMatchKeys = new Set(["id:ingredient-1"]);
  const singleMissingResults = findSingleMissingIngredients(
    [
      {
        id: "recipe-1",
        title: "Unlockable Pasta",
        recipe_ingredients: [
          {
            ingredient_id: "ingredient-1",
            raw_text: "Tomatoes",
            ingredients: { name: "tomatoes" }
          },
          {
            ingredient_id: "ingredient-2",
            raw_text: "Salt",
            ingredients: { name: "salt" }
          }
        ]
      },
      {
        id: "recipe-2",
        title: "Already Available",
        recipe_ingredients: [
          {
            ingredient_id: "ingredient-1",
            raw_text: "Tomatoes",
            ingredients: { name: "tomatoes" }
          }
        ]
      },
      {
        id: "recipe-3",
        title: "Missing Too Much",
        recipe_ingredients: [
          {
            ingredient_id: "ingredient-2",
            raw_text: "Salt",
            ingredients: { name: "salt" }
          },
          {
            ingredient_id: "ingredient-3",
            raw_text: "Pepper",
            ingredients: { name: "pepper" }
          }
        ]
      },
      {
        id: "recipe-4",
        title: "Duplicate Ingredient Rows",
        recipe_ingredients: [
          {
            ingredient_id: "ingredient-1",
            raw_text: "Tomatoes",
            ingredients: { name: "tomatoes" }
          },
          {
            ingredient_id: "ingredient-2",
            raw_text: "Salt",
            ingredients: { name: "salt" }
          },
          {
            ingredient_id: "ingredient-2",
            raw_text: "Salt",
            ingredients: { name: "salt" }
          }
        ]
      }
    ],
    pantryMatchKeys
  );

  assert.deepEqual(singleMissingResults, [
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-1",
        title: "Unlockable Pasta"
      }
    },
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-4",
        title: "Duplicate Ingredient Rows"
      }
    }
  ]);
});

test("rankGroceries aggregates recipes by ingredient and sorts by count then name", () => {
  const rankedRecommendations = rankGroceries([
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-1",
        title: "Recipe One"
      }
    },
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-2",
        title: "Recipe Two"
      }
    },
    {
      ingredientId: "ingredient-3",
      ingredientName: "apples",
      recipe: {
        id: "recipe-3",
        title: "Recipe Three"
      }
    }
  ]);

  assert.deepEqual(rankedRecommendations, [
    {
      ingredient_id: "ingredient-2",
      ingredient: "salt",
      unlock_count: 2,
      recipes: [
        { id: "recipe-1", title: "Recipe One" },
        { id: "recipe-2", title: "Recipe Two" }
      ]
    },
    {
      ingredient_id: "ingredient-3",
      ingredient: "apples",
      unlock_count: 1,
      recipes: [
        { id: "recipe-3", title: "Recipe Three" }
      ]
    }
  ]);
});

test("buildGroceriesForUser compares pantry and recipes end-to-end, including raw_text fallback", async () => {
  const recommendations = await buildGroceriesForUser("user-123", {
    from(tableName) {
      if (tableName === "pantry_items") {
        return {
          select(columns) {
            assert.match(columns, /ingredient_id/);
            return {
              eq(columnName, value) {
                assert.equal(columnName, "user_id");
                assert.equal(value, "user-123");
                return Promise.resolve({
                  data: [
                    {
                      ingredient_id: "ingredient-1",
                      ingredients: {
                        name: "tomatoes"
                      }
                    },
                    {
                      ingredient_id: "ingredient-4",
                      ingredients: {
                        name: "garlic"
                      }
                    }
                  ],
                  error: null
                });
              }
            };
          }
        };
      }

      if (tableName === "recipes") {
        return {
          select(columns) {
            assert.match(columns, /recipe_ingredients/);
            return {
              eq(columnName, value) {
                assert.equal(columnName, "created_by");
                assert.equal(value, "user-123");
                return Promise.resolve({
                  data: [
                    {
                      id: "recipe-1",
                      title: "Tomato Soup",
                      recipe_ingredients: [
                        {
                          ingredient_id: "ingredient-1",
                          raw_text: "Tomatoes",
                          ingredients: { name: "tomatoes" }
                        },
                        {
                          ingredient_id: "ingredient-2",
                          raw_text: "Salt",
                          ingredients: { name: "salt" }
                        }
                      ]
                    },
                    {
                      id: "recipe-2",
                      title: "Garlic Pasta",
                      recipe_ingredients: [
                        {
                          ingredient_id: "ingredient-4",
                          raw_text: "Garlic",
                          ingredients: { name: "garlic" }
                        },
                        {
                          ingredient_id: null,
                          raw_text: "Heavy Cream!!",
                          ingredients: null
                        }
                      ]
                    },
                    {
                      id: "recipe-3",
                      title: "Still Missing Too Much",
                      recipe_ingredients: [
                        {
                          ingredient_id: "ingredient-2",
                          raw_text: "Salt",
                          ingredients: { name: "salt" }
                        },
                        {
                          ingredient_id: "ingredient-3",
                          raw_text: "Pepper",
                          ingredients: { name: "pepper" }
                        }
                      ]
                    }
                  ],
                  error: null
                });
              }
            };
          }
        };
      }

      throw new Error(`Unexpected table lookup: ${tableName}`);
    }
  });

  assert.deepEqual(recommendations, [
    {
      ingredient_id: null,
      ingredient: "heavy cream",
      unlock_count: 1,
      recipes: [
        {
          id: "recipe-2",
          title: "Garlic Pasta"
        }
      ]
    },
    {
      ingredient_id: "ingredient-2",
      ingredient: "salt",
      unlock_count: 1,
      recipes: [
        {
          id: "recipe-1",
          title: "Tomato Soup"
        }
      ]
    }
  ]);
});

test("buildGroceriesForUser returns an empty list when nothing is singly unlockable", async () => {
  const recommendations = await buildGroceriesForUser("user-123", {
    from(tableName) {
      if (tableName === "pantry_items") {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: [],
                  error: null
                });
              }
            };
          }
        };
      }

      if (tableName === "recipes") {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: [
                    {
                      id: "recipe-1",
                      title: "Missing Too Much",
                      recipe_ingredients: [
                        {
                          ingredient_id: "ingredient-1",
                          raw_text: "Tomatoes",
                          ingredients: { name: "tomatoes" }
                        },
                        {
                          ingredient_id: "ingredient-2",
                          raw_text: "Salt",
                          ingredients: { name: "salt" }
                        }
                      ]
                    }
                  ],
                  error: null
                });
              }
            };
          }
        };
      }

      throw new Error(`Unexpected table lookup: ${tableName}`);
    }
  });

  assert.deepEqual(recommendations, []);
});