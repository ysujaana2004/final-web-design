const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGroceriesForUser,
  buildPantryMatchKeys,
  findMissingIngredients,
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

test("findMissingIngredients keeps every missing ingredient, tagging only sole-missing ones as wouldUnlockRecipe", () => {
  const pantryMatchKeys = new Set(["id:ingredient-1"]);
  const missingResults = findMissingIngredients(
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

  assert.deepEqual(missingResults, [
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-1",
        title: "Unlockable Pasta"
      },
      wouldUnlockRecipe: true
    },
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-3",
        title: "Missing Too Much"
      },
      wouldUnlockRecipe: false
    },
    {
      ingredientId: "ingredient-3",
      ingredientName: "pepper",
      recipe: {
        id: "recipe-3",
        title: "Missing Too Much"
      },
      wouldUnlockRecipe: false
    },
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-4",
        title: "Duplicate Ingredient Rows"
      },
      wouldUnlockRecipe: true
    }
  ]);
});

test("rankGroceries aggregates only sole-missing recipes into unlock_count, but keeps every ingredient", () => {
  const rankedRecommendations = rankGroceries([
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-1",
        title: "Recipe One"
      },
      wouldUnlockRecipe: true
    },
    {
      ingredientId: "ingredient-2",
      ingredientName: "salt",
      recipe: {
        id: "recipe-2",
        title: "Recipe Two"
      },
      wouldUnlockRecipe: true
    },
    {
      ingredientId: "ingredient-3",
      ingredientName: "apples",
      recipe: {
        id: "recipe-3",
        title: "Recipe Three"
      },
      wouldUnlockRecipe: true
    },
    {
      ingredientId: "ingredient-4",
      ingredientName: "pepper",
      recipe: {
        id: "recipe-4",
        title: "Recipe Four"
      },
      wouldUnlockRecipe: false
    },
    {
      ingredientId: "ingredient-5",
      ingredientName: "carrots",
      recipe: {
        id: "recipe-5",
        title: "Recipe Five"
      },
      wouldUnlockRecipe: false
    },
    {
      ingredientId: "ingredient-5",
      ingredientName: "carrots",
      recipe: {
        id: "recipe-6",
        title: "Recipe Six"
      },
      wouldUnlockRecipe: false
    }
  ]);

  assert.deepEqual(rankedRecommendations, [
    {
      ingredient_id: "ingredient-2",
      ingredient: "salt",
      unlock_count: 2,
      recipe_count: 2,
      recipes: [
        { id: "recipe-1", title: "Recipe One" },
        { id: "recipe-2", title: "Recipe Two" }
      ]
    },
    {
      ingredient_id: "ingredient-3",
      ingredient: "apples",
      unlock_count: 1,
      recipe_count: 1,
      recipes: [
        { id: "recipe-3", title: "Recipe Three" }
      ]
    },
    {
      ingredient_id: "ingredient-5",
      ingredient: "carrots",
      unlock_count: 0,
      recipe_count: 2,
      recipes: []
    },
    {
      ingredient_id: "ingredient-4",
      ingredient: "pepper",
      unlock_count: 0,
      recipe_count: 1,
      recipes: []
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
      ingredient_id: "ingredient-2",
      ingredient: "salt",
      unlock_count: 1,
      recipe_count: 2,
      recipes: [
        {
          id: "recipe-1",
          title: "Tomato Soup"
        }
      ]
    },
    {
      ingredient_id: null,
      ingredient: "heavy cream",
      unlock_count: 1,
      recipe_count: 1,
      recipes: [
        {
          id: "recipe-2",
          title: "Garlic Pasta"
        }
      ]
    },
    {
      ingredient_id: "ingredient-3",
      ingredient: "pepper",
      unlock_count: 0,
      recipe_count: 1,
      recipes: []
    }
  ]);
});

test("buildGroceriesForUser still lists ingredients that never singly unlock a recipe, with unlock_count 0", async () => {
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

  assert.deepEqual(recommendations, [
    {
      ingredient_id: "ingredient-2",
      ingredient: "salt",
      unlock_count: 0,
      recipe_count: 1,
      recipes: []
    },
    {
      ingredient_id: "ingredient-1",
      ingredient: "tomatoes",
      unlock_count: 0,
      recipe_count: 1,
      recipes: []
    }
  ]);
});