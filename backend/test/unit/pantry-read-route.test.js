const test = require("node:test");
const assert = require("node:assert/strict");

const { createPantryRouter } = require("../../src/routes/pantry");
const {
  createMockResponse,
  getRouteHandler
} = require("./helpers/http");

test("GET /api/pantry filters pantry rows by the authenticated user", async () => {
  let receivedUserId = null;
  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "pantry_items");
        return {
          select(columns) {
            assert.match(columns, /user_id/);
            return {
              eq(columnName, value) {
                assert.equal(columnName, "user_id");
                receivedUserId = value;
                return Promise.resolve({
                  data: [
                    {
                      id: "pantry-1",
                      user_id: "user-123",
                      ingredients: { name: "garlic" }
                    }
                  ],
                  error: null
                });
              }
            };
          }
        };
      }
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();

  await handler(
    {
      user: { id: " user-123 " }
    },
    response,
    () => {}
  );

  assert.equal(receivedUserId, "user-123");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data[0].user_id, "user-123");
});

test("GET /api/pantry uses the authenticated user", async () => {
  let receivedUserId = null;

  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "pantry_items");
        return {
          select() {
            return {
              eq(columnName, value) {
                assert.equal(columnName, "user_id");
                receivedUserId = value;
                return Promise.resolve({
                  data: [],
                  error: null
                });
              }
            };
          }
        };
      }
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();

  await handler({ user: { id: "dev-user-123" } }, response, () => {});

  assert.equal(receivedUserId, "dev-user-123");
  assert.equal(response.statusCode, 200);
});

test("GET /api/pantry/:id returns 404 when the item does not belong to that user", async () => {
  const router = createPantryRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "pantry_items");
        return {
          select() {
            return {
              eq(columnName, value) {
                assert.equal(columnName, "id");
                assert.equal(value, "pantry-404");
                return {
                  eq(secondColumnName, secondValue) {
                    assert.equal(secondColumnName, "user_id");
                    assert.equal(secondValue, "user-123");
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
              }
            };
          }
        };
      }
    }
  });
  const handler = getRouteHandler(router, "get", "/:id");
  const response = createMockResponse();

  await handler(
    {
      params: {
        id: "pantry-404"
      },
      user: { id: "user-123" }
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    error: "Pantry item not found"
  });
});
