const express = require("express");
const { env } = require("../lib/env");
const { buildGroceriesForUser } = require("../services/groceries");

function normalizeUserId(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function resolveGroceriesUserId(req = {}) {
  // Match the same precedence used elsewhere in the backend so local CLI
  // testing and future frontend wiring behave consistently.
  return normalizeUserId(req.body?.user_id)
    || normalizeUserId(req.query?.user_id)
    || env.devTestUserId
    || "";
}

function createGroceriesRouter(dependencies = {}) {
  const router = express.Router();
  const buildGroceries = dependencies.buildGroceriesForUser || buildGroceriesForUser;

  // GET /api/groceries
  router.get("/", async (req, res, next) => {
    try {
      const userId = resolveGroceriesUserId(req);

      if (!userId) {
        return res.status(400).json({
          error: 'A "user_id" is required.'
        });
      }

      // Keep ranking logic in the service layer so this route only handles HTTP.
      const data = await buildGroceries(userId);

      res.json({
        status: "ok",
        data
      });
    } catch (error) {
      next(error);
    }
  });

  router.all("*", (_req, res) => {
    res.status(404).json({
      message: "Grocery route not found."
    });
  });

  return router;
}

module.exports = createGroceriesRouter();
module.exports.createGroceriesRouter = createGroceriesRouter;
module.exports.resolveGroceriesUserId = resolveGroceriesUserId;