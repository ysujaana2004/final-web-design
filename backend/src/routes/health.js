const express = require("express");

const { supabase } = require("../lib/db");
const { requireAuth } = require("../middleware/require-auth");

function createHealthRouter(dependencies = {}) {
  const router = express.Router();
  const database = dependencies.supabase || supabase;

  router.get("/", (_req, res) => {
    res.json({
      status: "ok"
    });
  });

  router.use("/db", requireAuth);

  router.get("/db", async (req, res) => {
    try {
      // a tiny read of Supabase. It verifies that the backend can
      // reach Supabase and that the expected pantry table is queryable.
      const requestDatabase = req.supabase || database;
      const { error } = await requestDatabase
        .from("pantry_items")
        .select("id")
        .limit(1);

      if (error) {
        throw error;
      }

      res.json({
        status: "ok",
        database: "reachable",
        check: 'SELECT id FROM "pantry_items" LIMIT 1'
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        database: "unreachable",
        check: 'SELECT id FROM "pantry_items" LIMIT 1',
        error: error.message || "Database health check failed."
      });
    }
  });

  return router;
}

module.exports = createHealthRouter();
module.exports.createHealthRouter = createHealthRouter;
