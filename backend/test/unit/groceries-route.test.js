const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createGroceriesRouter,
  resolveGroceriesUserId
} = require("../../src/routes/groceries");
const { env } = require("../../src/lib/env");
const {
  createMockResponse,
  getRouteHandler
} = require("./helpers/http");

test("resolveGroceriesUserId prefers request values before DEV_TEST_USER_ID", () => {
  const originalDevTestUserId = env.devTestUserId;
  env.devTestUserId = "dev-user-123";

  assert.equal(
    resolveGroceriesUserId({
      body: {
        user_id: " body-user "
      },
      query: {
        user_id: "query-user"
      }
    }),
    "body-user"
  );

  assert.equal(
    resolveGroceriesUserId({
      query: {
        user_id: " query-user "
      }
    }),
    "query-user"
  );

  assert.equal(resolveGroceriesUserId({}), "dev-user-123");
  env.devTestUserId = originalDevTestUserId;
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
      query: {
        user_id: " user-123 "
      }
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

test("GET /api/groceries falls back to DEV_TEST_USER_ID", async () => {
  const originalDevTestUserId = env.devTestUserId;
  env.devTestUserId = "dev-user-123";
  const buildCalls = [];
  const router = createGroceriesRouter({
    buildGroceriesForUser: async (userId) => {
      buildCalls.push(userId);
      return [];
    }
  });
  const handler = getRouteHandler(router, "get", "/");
  const response = createMockResponse();

  await handler({}, response, () => {});

  assert.deepEqual(buildCalls, ["dev-user-123"]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    data: []
  });
  env.devTestUserId = originalDevTestUserId;
});

test("GET /api/groceries returns 400 when no user can be resolved", async () => {
  const originalDevTestUserId = env.devTestUserId;
  env.devTestUserId = "";
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
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: 'A "user_id" is required.'
  });
  env.devTestUserId = originalDevTestUserId;
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
      query: {
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
  assert.equal(nextCalls[0].message, "groceries lookup failed");
});