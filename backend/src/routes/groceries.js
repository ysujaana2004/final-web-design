const express = require("express");
const { supabase } = require("../lib/db");
const { buildGroceriesForUser } = require("../services/groceries");

function normalizeUserId(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function resolveGroceriesUserId(req = {}) {
  return normalizeUserId(req.user?.id);
}

function createGroceriesRouter(dependencies = {}) {
  const router = express.Router();
  const buildGroceries = dependencies.buildGroceriesForUser || buildGroceriesForUser;
  const database = dependencies.supabase || supabase;

  // GET /api/groceries
  router.get("/", async (req, res, next) => {
    try {
      const userId = resolveGroceriesUserId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      // Keep ranking logic in the service layer so this route only handles HTTP.
      const data = await buildGroceries(userId, requestDatabase);

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
