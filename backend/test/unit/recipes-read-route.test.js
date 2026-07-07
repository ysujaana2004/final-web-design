const test = require("node:test");
const assert = require("node:assert/strict");

const { createRecipesRouter } = require("../../src/routes/recipes");
const {
  createMockResponse,
  getRouteHandler
} = require("./helpers/http");

test("GET /api/recipes requires a user_id and filters recipes by that owner", async () => {
  let receivedUserId = null;
  const router = createRecipesRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "recipes");
        return {
          select(columns) {
            assert.match(columns, /created_by/);
            return {
              eq(columnName, value) {
                assert.equal(columnName, "created_by");
                receivedUserId = value;
                return {
                  order(orderColumnName, options) {
                    assert.equal(orderColumnName, "created_at");
                    assert.deepEqual(options, { ascending: false });
                    return Promise.resolve({
                      data: [
                        {
                          id: "recipe-1",
                          created_by: "user-123",
                          title: "Toast"
                        }
                      ],
                      error: null
                    });
                  }
                };
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
      query: {
        user_id: " user-123 "
      }
    },
    response,
    () => {}
  );

  assert.equal(receivedUserId, "user-123");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data[0].created_by, "user-123");
});

test("GET /api/recipes/:id returns 404 when the recipe does not belong to that user", async () => {
  const router = createRecipesRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "recipes");
        return {
          select() {
            return {
              eq(columnName, value) {
                assert.equal(columnName, "id");
                assert.equal(value, "recipe-404");
                return {
                  eq(secondColumnName, secondValue) {
                    assert.equal(secondColumnName, "created_by");
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
        id: "recipe-404"
      },
      query: {
        user_id: "user-123"
      }
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    error: "Recipe not found"
  });
});
