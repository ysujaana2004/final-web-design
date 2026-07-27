const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createGroceriesRouter,
  resolveGroceriesUserId
} = require("../../src/routes/groceries");
const {
  createMockResponse,
  getRouteHandler
} = require("./helpers/http");

test("resolveGroceriesUserId uses only the authenticated user", () => {
  assert.equal(resolveGroceriesUserId({ user: { id: " user-123 " } }), "user-123");
  assert.equal(resolveGroceriesUserId({ body: { user_id: "body-user" } }), "");
});

test("GET /api/groceries returns structured recommendations from the service", async () => {
  const buildCalls = [];
  const router = createGroceriesRouter({
    buildGroceriesForUser: async (userId) => {
      buildCalls.push(userId);
      return [
        {
          ingredient_id: "ingredient-1",
          ingredient: "tomatoes",
          unlock_count: 2,
          recipes: [
            { id: "recipe-1", title: "Tomato Soup" },
            { id: "recipe-2", title: "Shakshuka" }
          ]
        }
      ];
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      user: { id: " user-123 " }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.deepEqual(buildCalls, ["user-123"]);
  assert.equal(nextCalls.length, 0);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    data: [
      {
        ingredient_id: "ingredient-1",
        ingredient: "tomatoes",
        unlock_count: 2,
        recipes: [
          { id: "recipe-1", title: "Tomato Soup" },
          { id: "recipe-2", title: "Shakshuka" }
        ]
      }
    ]
  });
});

test("GET /api/groceries uses the authenticated user", async () => {
  const buildCalls = [];
  const router = createGroceriesRouter({
    buildGroceriesForUser: async (userId) => {
      buildCalls.push(userId);
      return [];
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();

  await handler({ user: { id: "dev-user-123" } }, response, () => {});

  assert.deepEqual(buildCalls, ["dev-user-123"]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    data: []
  });
});

test("GET /api/groceries returns 401 when no authenticated user is present", async () => {
  let buildWasCalled = false;
  const router = createGroceriesRouter({
    buildGroceriesForUser: async () => {
      buildWasCalled = true;
      return [];
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();

  await handler({}, response, () => {});

  assert.equal(buildWasCalled, false);
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, {
    error: "Authentication is required."
  });
});

test("GET /api/groceries forwards unexpected service errors", async () => {
  const router = createGroceriesRouter({
    buildGroceriesForUser: async () => {
      throw new Error("groceries lookup failed");
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      user: { id: "user-123" }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(response.body, null);
  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0].message, "groceries lookup failed");
});
