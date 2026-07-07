const test = require("node:test");
const assert = require("node:assert/strict");

const { createPantryRouter } = require("../../src/routes/pantry");

function getPostHandler(router) {
  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === "/" && layer.route.methods?.post
  );

  assert.ok(routeLayer, "POST / route should exist");
  return routeLayer.route.stack[0].handle;
}

function createMockResponse() {
  return {
    body: null,
    statusCode: 200,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    }
  };
}

test("POST /api/pantry rejects requests without user_id or ingredient", async () => {
  const router = createPantryRouter();
  const handler = getPostHandler(router);
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
                  assert.match(columns, /ingredients \(name\)/);
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: "pantry-1",
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
  const handler = getPostHandler(router);
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
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    data: {
      id: "pantry-1",
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
  const handler = getPostHandler(router);
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
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.ingredients.name, "paprika");
});
