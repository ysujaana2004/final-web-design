const express = require("express");
const { supabase } = require("../lib/db");
const {
  normalizeIngredientName,
  resolveOrCreateIngredientId
} = require("../lib/ingredients");

const PANTRY_SELECT = `
  id,
  user_id,
  quantity,
  unit,
  created_at,
  ingredient_id,
  ingredients (
    name
  )
`;

function normalizeUserId(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function resolvePantryUserId(req = {}) {
  return normalizeUserId(req.user?.id);
}

function createPantryRouter(dependencies = {}) {
  const router = express.Router();
  const database = dependencies.supabase || supabase;

  // GET /api/pantry
  router.get("/", async (req, res, next) => {
    try {
      const userId = resolvePantryUserId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { data, error } = await requestDatabase
        .from("pantry_items")
        .select(PANTRY_SELECT)
        .eq("user_id", userId);

      if (error) throw error;

      res.json({
        status: "ok",
        data
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/pantry/:id
  router.get("/:id", async (req, res, next) => {
    try {
      const userId = resolvePantryUserId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { data, error } = await requestDatabase
        .from("pantry_items")
        .select(PANTRY_SELECT)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: "Pantry item not found"
        });
      }

      res.json({
        status: "ok",
        data
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/pantry
  router.post("/", async (req, res, next) => {
    try {
      const { ingredient, quantity, unit } = req.body;
      const userId = resolvePantryUserId(req);
      const requestDatabase = req.supabase || database;
      const normalizedIngredient = normalizeIngredientName(ingredient);

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      if (!normalizedIngredient) {
        return res.status(400).json({ error: "An ingredient is required." });
      }

      const ingredientId = await resolveOrCreateIngredientId(normalizedIngredient, requestDatabase);

      const pantryItem = {
        user_id: userId,
        ingredient_id: ingredientId,
        quantity: quantity ?? null,
        unit: unit || null
      };

      const { data, error } = await requestDatabase
        .from("pantry_items")
        .insert([pantryItem])
        .select(PANTRY_SELECT)
        .single();

      if (error) throw error;

      res.status(201).json({
        status: "ok",
        data
      });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/pantry/:id
  router.put("/:id", async (req, res, next) => {
    try {
      const userId = resolvePantryUserId(req);
      const { quantity, unit } = req.body;
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      // `undefined` means "not provided"; null or 0 are still valid updates.
      if (quantity === undefined && unit === undefined) {
        return res.status(400).json({
          error: "quantity or unit is required"
        });
      }

      const updateFields = {};

      if (quantity !== undefined) {
        updateFields.quantity = quantity;
      }

      if (unit !== undefined) {
        updateFields.unit = unit || null;
      }

      const { data, error } = await requestDatabase
        .from("pantry_items")
        .update(updateFields)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select(PANTRY_SELECT)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: "Pantry item not found"
        });
      }

      res.json({
        status: "ok",
        data
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/pantry/:id
  router.delete("/:id", async (req, res, next) => {
    try {
      const userId = resolvePantryUserId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { data, error } = await requestDatabase
        .from("pantry_items")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: "Pantry item not found"
        });
      }

      res.json({
        status: "ok",
        message: "Pantry item deleted"
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createPantryRouter();
module.exports.createPantryRouter = createPantryRouter;
module.exports.resolvePantryUserId = resolvePantryUserId;
