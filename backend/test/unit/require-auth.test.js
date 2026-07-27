const test = require("node:test");
const assert = require("node:assert/strict");

const { getBearerToken } = require("../../src/middleware/require-auth");

test("getBearerToken accepts a bearer token and rejects other authorization values", () => {
  assert.equal(
    getBearerToken({ get: () => "Bearer access-token" }),
    "access-token"
  );
  assert.equal(getBearerToken({ get: () => "Basic credentials" }), "");
  assert.equal(getBearerToken({ get: () => "" }), "");
});
