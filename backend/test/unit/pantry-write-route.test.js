const test = require("node:test");
const assert = require("node:assert/strict");

const { createPantryRouter } = require("../../src/routes/pantry");
const {
  createMockResponse,
  getRouteHandler
} = require("./helpers/http");

test("POST /api/pantry rejects requests without user_id or ingredient", async () => {
  const router = createPantryRouter();
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();
  let nextWasCalled = false;

  await handler(
    {
      body: {
        ingredient: "Garlic"
      }
    },
    response,
    () => {
      nextWasCalled = true;
    }
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: "user_id and ingredient are required"
  });
  assert.equal(nextWasCalled, false);
});

test("POST /api/pantry reuses an existing normalized ingredient row", async () => {
  const calls = [];
  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        calls.push(tableName);

        if (tableName === "ingredients") {
          return {
            select(columns) {
              assert.equal(columns, "id");
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "name");
                  assert.equal(value, "heavy cream");
                  return {
                    maybeSingle() {
                      return Promise.resolve({
                        data: { id: "ingredient-1" },
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }

        if (tableName === "pantry_items") {
          return {
            insert(rows) {
              assert.deepEqual(rows, [
                {
                  user_id: "user-123",
                  ingredient_id: "ingredient-1",
                  quantity: null,
                  unit: null
                }
              ]);

              return {
                select(columns) {
                  assert.match(columns, /ingredients \(.*name.*\)/s);
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: "pantry-1",
                          user_id: "user-123",
                          quantity: null,
                          unit: null,
                          ingredients: {
                            name: "heavy cream"
                          }
                        },
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }

        throw new Error(`Unexpected table lookup: ${tableName}`);
      }
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      body: {
        user_id: " user-123 ",
        ingredient: "  Heavy Cream!! "
      }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(nextCalls.length, 0);
  assert.deepEqual(calls, ["ingredients", "pantry_items"]);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, {
    status: "ok",
    data: {
      id: "pantry-1",
      user_id: "user-123",
      quantity: null,
      unit: null,
      ingredients: {
        name: "heavy cream"
      }
    }
  });
});

test("POST /api/pantry creates a new canonical ingredient row when missing", async () => {
  const calls = [];
  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        calls.push(tableName);

        if (tableName === "ingredients") {
          return {
            select(columns) {
              assert.equal(columns, "id");
              return {
                eq(columnName, value) {
                  assert.equal(columnName, "name");
                  assert.equal(value, "paprika");
                  return {
                    maybeSingle() {
                      return Promise.resolve({
                        data: null,
                        error: null
                      });
                    }
                  };
                }
              };
            },
            insert(row) {
              assert.deepEqual(row, {
                name: "paprika"
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

        if (tableName === "pantry_items") {
          return {
            insert(rows) {
              assert.deepEqual(rows, [
                {
                  user_id: "user-123",
                  ingredient_id: "ingredient-2",
                  quantity: null,
                  unit: null
                }
              ]);

              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: "pantry-2",
                          user_id: "user-123",
                          quantity: null,
                          unit: null,
                          ingredients: {
                            name: "paprika"
                          }
                        },
                        error: null
                      });
                    }
                  };
                }
              };
            }
          };
        }

        throw new Error(`Unexpected table lookup: ${tableName}`);
      }
    }
  });
  const handler = getRouteHandler(router, "post", "/");
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      body: {
        user_id: "user-123",
        ingredient: "Paprika"
      }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(nextCalls.length, 0);
  assert.deepEqual(calls, ["ingredients", "ingredients", "pantry_items"]);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.data.ingredients.name, "paprika");
});

test("PUT /api/pantry/:id scopes updates to the owning user", async () => {
  let capturedUpdateFields = null;
  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "pantry_items");
        return {
          update(updateFields) {
            capturedUpdateFields = updateFields;
            return {
              eq(columnName, value) {
                assert.equal(columnName, "id");
                assert.equal(value, "pantry-1");
                return {
                  eq(secondColumnName, secondValue) {
                    assert.equal(secondColumnName, "user_id");
                    assert.equal(secondValue, "user-123");
                    return {
                      select() {
                        return {
                          maybeSingle() {
                            return Promise.resolve({
                              data: {
                                id: "pantry-1",
                                user_id: "user-123",
                                quantity: 0,
                                unit: null,
                                ingredients: {
                                  name: "salt"
                                }
                              },
                              error: null
                            });
                          }
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    }
  });
  const handler = getRouteHandler(router, "put", "/:id");
  const response = createMockResponse();

  await handler(
    {
      params: {
        id: "pantry-1"
      },
      body: {
        user_id: "user-123",
        quantity: 0,
        unit: ""
      }
    },
    response,
    () => {}
  );

  assert.deepEqual(capturedUpdateFields, {
    quantity: 0,
    unit: null
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.quantity, 0);
});

test("DELETE /api/pantry/:id scopes deletes to the owning user", async () => {
  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "pantry_items");
        return {
          delete() {
            return {
              eq(columnName, value) {
                assert.equal(columnName, "id");
                assert.equal(value, "pantry-1");
                return {
                  eq(secondColumnName, secondValue) {
                    assert.equal(secondColumnName, "user_id");
                    assert.equal(secondValue, "user-123");
                    return {
                      select(columns) {
                        assert.equal(columns, "id");
                        return {
                          maybeSingle() {
                            return Promise.resolve({
                              data: { id: "pantry-1" },
                              error: null
                            });
                          }
                        };
                      }
                    };
                  }
                };
              }
            };
          }
        };
      }
    }
  });
  const handler = getRouteHandler(router, "delete", "/:id");
  const response = createMockResponse();

  await handler(
    {
      params: {
        id: "pantry-1"
      },
      query: {
        user_id: "user-123"
      }
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    message: "Pantry item deleted"
  });
});
