const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRecipeIngredientRows,
  createRecipesRouter,
  saveGeneratedRecipe
} = require("../../src/routes/recipes");
const { env } = require("../../src/lib/env");
const {
  createMockResponse,
  getRouteHandler
} = require("./helpers/http");

test("POST /api/recipes returns a generated recipe and cleans up temporary audio", async () => {
  const cleanupCalls = [];
  const saveCalls = [];
  const router = createRecipesRouter({
    cleanupDownloadedAudio: async (tempDirectory) => {
      cleanupCalls.push(tempDirectory);
    },
    downloadAudio: async (videoUrl) => ({
      filePath: "/tmp/audio.mp3",
      sourceUrl: `${videoUrl}?normalized=true`,
      tempDirectory: "/tmp/recipe-download"
    }),
    generateRecipeFromAudio: async () => ({
      title: "Garlic Toast",
      ingredients: ["Bread", "Butter", "Garlic"],
      instructions: ["Toast the bread.", "Spread the garlic butter."]
    }),
    saveGeneratedRecipe: async (payload) => {
      saveCalls.push(payload);
      return {
        id: "recipe-123"
      };
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();
  let nextWasCalled = false;

  await handler(
    {
      body: {
        videoUrl: "https://www.instagram.com/reel/test/",
        user_id: "user-123"
      }
    },
    response,
    () => {
      nextWasCalled = true;
    }
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, {
    sourceUrl: "https://www.instagram.com/reel/test/?normalized=true",
    recipe: {
      title: "Garlic Toast",
      ingredients: ["Bread", "Butter", "Garlic"],
      instructions: ["Toast the bread.", "Spread the garlic butter."]
    },
    recipeId: "recipe-123"
  });
  assert.equal(nextWasCalled, false);
  assert.deepEqual(cleanupCalls, ["/tmp/recipe-download"]);
  assert.deepEqual(saveCalls, [
    {
      sourceUrl: "https://www.instagram.com/reel/test/?normalized=true",
      recipe: {
        title: "Garlic Toast",
        ingredients: ["Bread", "Butter", "Garlic"],
        instructions: ["Toast the bread.", "Spread the garlic butter."]
      },
      userId: "user-123"
    }
  ]);
});

test("POST /api/recipes rejects requests without a videoUrl", async () => {
  let downloadWasCalled = false;
  const router = createRecipesRouter({
    downloadAudio: async () => {
      downloadWasCalled = true;
      throw new Error("download should not run");
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();

  await handler(
    {
      body: {}
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: 'A non-empty "videoUrl" string is required.'
  });
  assert.equal(downloadWasCalled, false);
});

test("POST /api/recipes rejects requests without a user", async () => {
  const originalDevTestUserId = env.devTestUserId;
  env.devTestUserId = "";
  let downloadWasCalled = false;
  const router = createRecipesRouter({
    downloadAudio: async () => {
      downloadWasCalled = true;
      throw new Error("download should not run");
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();

  await handler(
    {
      body: {
        videoUrl: "https://www.instagram.com/reel/test/"
      }
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: 'A "user_id" is required unless DEV_TEST_USER_ID is configured.'
  });
  assert.equal(downloadWasCalled, false);
  env.devTestUserId = originalDevTestUserId;
});

test("POST /api/recipes cleans up temporary audio when Gemini fails", async () => {
  const cleanupCalls = [];
  const router = createRecipesRouter({
    cleanupDownloadedAudio: async (tempDirectory) => {
      cleanupCalls.push(tempDirectory);
    },
    downloadAudio: async () => ({
      filePath: "/tmp/audio.mp3",
      sourceUrl: "https://www.tiktok.com/@cook/video/123",
      tempDirectory: "/tmp/recipe-download"
    }),
    generateRecipeFromAudio: async () => {
      throw new Error("Gemini is temporarily unavailable.");
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      body: {
        videoUrl: "https://www.tiktok.com/@cook/video/123",
        user_id: "user-123"
      }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(response.body, null);
  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0].message, "Gemini is temporarily unavailable.");
  assert.deepEqual(cleanupCalls, ["/tmp/recipe-download"]);
});

test("POST /api/recipes cleans up temporary audio when recipe saving fails", async () => {
  const cleanupCalls = [];
  const router = createRecipesRouter({
    cleanupDownloadedAudio: async (tempDirectory) => {
      cleanupCalls.push(tempDirectory);
    },
    downloadAudio: async () => ({
      filePath: "/tmp/audio.mp3",
      sourceUrl: "https://www.instagram.com/reel/test/",
      tempDirectory: "/tmp/recipe-download"
    }),
    generateRecipeFromAudio: async () => ({
      title: "Garlic Toast",
      ingredients: ["Bread", "Butter", "Garlic"],
      instructions: ["Toast the bread.", "Spread the garlic butter."]
    }),
    saveGeneratedRecipe: async () => {
      throw new Error("Recipe insert failed.");
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      body: {
        videoUrl: "https://www.instagram.com/reel/test/",
        user_id: "user-123"
      }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(response.body, null);
  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0].message, "Recipe insert failed.");
  assert.deepEqual(cleanupCalls, ["/tmp/recipe-download"]);
});

test("PUT /api/recipes/:id updates only the owning user's recipe", async () => {
  const recipeUpdates = [];
  const deletedRecipeIngredientIds = [];
  const insertedRecipeIngredients = [];

  const router = createRecipesRouter({
    supabase: {
      from(tableName) {
        if (tableName === "recipes") {
          return {
            select(columns) {
              if (columns === "id") {
                return {
                  eq(columnName, value) {
                    assert.equal(columnName, "id");
                    assert.equal(value, "recipe-123");
                    return {
                      eq(secondColumnName, secondValue) {
                        assert.equal(secondColumnName, "created_by");
                        assert.equal(secondValue, "user-123");
                        return {
                          maybeSingle() {
                            return Promise.resolve({
                              data: { id: "recipe-123" },
                              error: null
                            });
                          }
                        };
                      }
                    };
                  }
                };
              }

              return {
                eq(columnName, value) {
                  assert.equal(columnName, "id");
                  assert.equal(value, "recipe-123");
                  return {
                    eq(secondColumnName, secondValue) {
                      assert.equal(secondColumnName, "created_by");
                      assert.equal(secondValue, "user-123");
                      return {
                        maybeSingle() {
                          return Promise.resolve({
                            data: {
                              id: "recipe-123",
                              created_by: "user-123",
                              title: "Updated Toast",
                              instructions: ["Step 1"],
                              recipe_ingredients: [
                                { raw_text: "Bread" },
                                { raw_text: "Butter" }
                              ]
                            },
                            error: null
                          });
                        }
                      };
                    }
                  };
                }
              };
            },
            update(updateFields) {
              recipeUpdates.push(updateFields);
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "id");
                  assert.equal(value, "recipe-123");
                  return {
                    eq(secondColumnName, secondValue) {
                      assert.equal(secondColumnName, "created_by");
                      assert.equal(secondValue, "user-123");
                      return Promise.resolve({
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }

        if (tableName === "ingredients") {
          return {
            select(columns) {
              assert.equal(columns, "id");
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "name");
                  return {
                    maybeSingle() {
                      if (value === "bread") {
                        return Promise.resolve({
                          data: { id: "ingredient-1" },
                          error: null
                        });
                      }

                      if (value === "butter") {
                        return Promise.resolve({
                          data: { id: "ingredient-2" },
                          error: null
                        });
                      }

                      throw new Error(`Unexpected ingredient lookup: ${value}`);
                    }
                  };
                }
              };
            }
          };
        }

        if (tableName === "recipe_ingredients") {
          return {
            delete() {
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "recipe_id");
                  deletedRecipeIngredientIds.push(value);
                  return Promise.resolve({
                    error: null
                  });
                }
              };
            },
            insert(rows) {
              insertedRecipeIngredients.push(...rows);
              return Promise.resolve({
                error: null
              });
            }
          };
        }

        throw new Error(`Unexpected table lookup: ${tableName}`);
      }
    }
  });
  const handler = getRouteHandler(router, "put", "/:id");
  const response = createMockResponse();

  await handler(
    {
      params: {
        id: "recipe-123"
      },
      body: {
        user_id: "user-123",
        title: " Updated Toast ",
        instructions: [" Step 1 "],
        ingredients: [" Bread ", " Butter "]
      }
    },
    response,
    () => {}
  );

  assert.deepEqual(recipeUpdates, [
    {
      title: "Updated Toast",
      instructions: ["Step 1"]
    }
  ]);
  assert.deepEqual(deletedRecipeIngredientIds, ["recipe-123"]);
  assert.deepEqual(insertedRecipeIngredients, [
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-1",
      raw_text: "Bread"
    },
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-2",
      raw_text: "Butter"
    }
  ]);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.id, "recipe-123");
});

test("DELETE /api/recipes/:id deletes only the owning user's recipe", async () => {
  const deletedRecipeIds = [];
  const router = createRecipesRouter({
    supabase: {
      from(tableName) {
        if (tableName === "recipes") {
          return {
            select(columns) {
              assert.equal(columns, "id");
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "id");
                  assert.equal(value, "recipe-123");
                  return {
                    eq(secondColumnName, secondValue) {
                      assert.equal(secondColumnName, "created_by");
                      assert.equal(secondValue, "user-123");
                      return {
                        maybeSingle() {
                          return Promise.resolve({
                            data: { id: "recipe-123" },
                            error: null
                          });
                        }
                      };
                    }
                  };
                }
              };
            },
            delete() {
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "id");
                  assert.equal(value, "recipe-123");
                  return {
                    eq(secondColumnName, secondValue) {
                      assert.equal(secondColumnName, "created_by");
                      assert.equal(secondValue, "user-123");
                      deletedRecipeIds.push(value);
                      return Promise.resolve({
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }

        if (tableName === "recipe_ingredients") {
          return {
            delete() {
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "recipe_id");
                  assert.equal(value, "recipe-123");
                  return Promise.resolve({
                    error: null
                  });
                }
              };
            }
          };
        }

        throw new Error(`Unexpected table lookup: ${tableName}`);
      }
    }
  });
  const handler = getRouteHandler(router, "delete", "/:id");
  const response = createMockResponse();

  await handler(
    {
      params: {
        id: "recipe-123"
      },
      query: {
        user_id: "user-123"
      }
    },
    response,
    () => {}
  );

  assert.deepEqual(deletedRecipeIds, ["recipe-123"]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    message: "Recipe deleted"
  });
});

test("buildRecipeIngredientRows stores raw text while resolving canonical ingredient ids", async () => {
  const rows = await buildRecipeIngredientRows(
    "recipe-123",
    ["Paprika", "Heavy Cream!!"],
    {
      from(tableName) {
        assert.equal(tableName, "ingredients");

        return {
          select(columns) {
            assert.equal(columns, "id");
            return {
              eq(columnName, value) {
                assert.equal(columnName, "name");
                return {
                  maybeSingle() {
                    if (value === "paprika") {
                      return Promise.resolve({
                        data: { id: "ingredient-1" },
                        error: null
                      });
                    }

                    if (value === "heavy cream") {
                      return Promise.resolve({
                        data: { id: "ingredient-2" },
                        error: null
                      });
                    }

                    throw new Error(`Unexpected ingredient lookup: ${value}`);
                  }
                };
              }
            };
          }
        };
      }
    }
  );

  assert.deepEqual(rows, [
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-1",
      raw_text: "Paprika"
    },
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-2",
      raw_text: "Heavy Cream!!"
    }
  ]);
});

test("saveGeneratedRecipe stores raw_text and canonical ingredient ids", async () => {
  const insertedRecipeIngredients = [];
  const ingredientLookups = [];

  const savedRecipe = await saveGeneratedRecipe(
    {
      sourceUrl: "https://www.instagram.com/reel/test/",
      recipe: {
        title: "Spicy Pasta",
        ingredients: ["Paprika", "Heavy Cream!!", "Paprika"],
        instructions: ["Cook pasta.", "Mix sauce."]
      },
      userId: "user-123"
    },
    {
      from(tableName) {
        if (tableName === "recipes") {
          return {
            insert(row) {
              assert.deepEqual(row, {
                title: "Spicy Pasta",
                instructions: ["Cook pasta.", "Mix sauce."],
                source_url: "https://www.instagram.com/reel/test/",
                created_by: "user-123"
              });

              return {
                select(columns) {
                  assert.equal(columns, "id");
                  return {
                    single() {
                      return Promise.resolve({
                        data: { id: "recipe-123" },
                        error: null
                      });
                    }
                  };
                }
              };
            },
            delete() {
              throw new Error("recipe cleanup should not run");
            }
          };
        }

        if (tableName === "ingredients") {
          return {
            select(columns) {
              assert.equal(columns, "id");
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "name");
                  ingredientLookups.push(value);

                  return {
                    maybeSingle() {
                      if (value === "paprika") {
                        return Promise.resolve({
                          data: { id: "ingredient-1" },
                          error: null
                        });
                      }

                      if (value === "heavy cream") {
                        return Promise.resolve({
                          data: null,
                          error: null
                        });
                      }

                      throw new Error(`Unexpected ingredient lookup: ${value}`);
                    }
                  };
                }
              };
            },
            insert(row) {
              assert.deepEqual(row, {
                name: "heavy cream"
              });

              return {
                select(columns) {
                  assert.equal(columns, "id");
                  return {
                    single() {
                      return Promise.resolve({
                        data: { id: "ingredient-2" },
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }

        if (tableName === "recipe_ingredients") {
          return {
            insert(rows) {
              insertedRecipeIngredients.push(...rows);
              return Promise.resolve({
                error: null
              });
            }
          };
        }

        throw new Error(`Unexpected table lookup: ${tableName}`);
      }
    }
  );

  assert.deepEqual(ingredientLookups, ["paprika", "heavy cream", "paprika"]);
  assert.deepEqual(insertedRecipeIngredients, [
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-1",
      raw_text: "Paprika"
    },
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-2",
      raw_text: "Heavy Cream!!"
    },
    {
      recipe_id: "recipe-123",
      ingredient_id: "ingredient-1",
      raw_text: "Paprika"
    }
  ]);
  assert.deepEqual(savedRecipe, {
    id: "recipe-123"
  });
});
