const test = require("node:test");
const assert = require("node:assert/strict");

const { createHealthRouter } = require("../../src/routes/health");

function getHandler(router, method, path) {
  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods?.[method]
  );

  assert.ok(routeLayer, `${method.toUpperCase()} ${path} route should exist`);
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

test("GET /api/health returns a basic app health response", async () => {
  const router = createHealthRouter();
  const handler = getHandler(router, "get", "/");
  const response = createMockResponse();

  await handler({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok"
  });
});

test("GET /api/health/db reports database reachability when the probe succeeds", async () => {
  const router = createHealthRouter({
    supabase: {
      from(tableName) {
        assert.equal(tableName, "pantry_items");
        return {
          select(columns) {
            assert.equal(columns, "id");
            return {
              limit(limitValue) {
                assert.equal(limitValue, 1);
                return Promise.resolve({ error: null });
              }
            };
          }
        };
      }
    }
  });
  const handler = getHandler(router, "get", "/db");
  const response = createMockResponse();

  await handler({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    database: "reachable",
    check: 'SELECT id FROM "pantry_items" LIMIT 1'
  });
});

test("GET /api/health/db returns a clear failure payload when the probe fails", async () => {
  const router = createHealthRouter({
    supabase: {
      from() {
        return {
          select() {
            return {
              limit() {
                return Promise.resolve({
                  error: new Error("relation \"pantry_items\" does not exist")
                });
              }
            };
          }
        };
      }
    }
  });
  const handler = getHandler(router, "get", "/db");
  const response = createMockResponse();

  await handler({}, response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    status: "error",
    database: "unreachable",
    check: 'SELECT id FROM "pantry_items" LIMIT 1',
    error: 'relation "pantry_items" does not exist'
  });
});
