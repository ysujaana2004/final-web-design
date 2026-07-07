const assert = require("node:assert/strict");

function getRouteHandler(router, method, path) {
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

module.exports = {
  createMockResponse,
  getRouteHandler
};
