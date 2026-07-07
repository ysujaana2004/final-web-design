const express = require("express");
const { supabase } = require("../lib/db");
const {
  normalizeIngredientName,
  resolveOrCreateIngredientId
} = require("../lib/ingredients");

function resolvePantryUserId(requestBody = {}) {
  return typeof requestBody.user_id === "string"
    ? requestBody.user_id.trim()
    : "";
}

function createPantryRouter(dependencies = {}) {
  const router = express.Router();
  const database = dependencies.supabase || supabase;

  // GET /api/pantry
  router.get("/", async (req, res, next) => {
    try {
      const { data, error } = await database
        .from("pantry_items")
        .select(`
          id,
          quantity,
          unit,
          created_at,
          ingredient_id,
          ingredients (
            name
          )
        `);

      if (error) throw error;

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
      const userId = resolvePantryUserId(req.body);
      const normalizedIngredient = normalizeIngredientName(ingredient);

      if (!userId || !normalizedIngredient) {
        return res.status(400).json({
          error: "user_id and ingredient are required"
        });
      }

      const ingredientId = await resolveOrCreateIngredientId(normalizedIngredient, database);

      const pantryItem = {
        user_id: userId,
        ingredient_id: ingredientId,
        quantity: quantity ?? null,
        unit: unit || null
      };

      const { data, error } = await database
        .from("pantry_items")
        .insert([pantryItem])
        .select(`
          id,
          quantity,
          unit,
          ingredients (name)
        `)
        .single();

      if (error) throw error;

      res.json({
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
      const { id } = req.params;
      const { quantity, unit } = req.body;

      if (!quantity && !unit) {
        return res.status(400).json({
          error: "quantity or unit is required"
        });
      }

      const { data, error } = await database
        .from("pantry_items")
        .update({
          quantity,
          unit
        })
        .eq("id", id)
        .select(`
          id,
          quantity,
          unit,
          ingredients (
            name
          )
        `)
        .single();

      if (error) throw error;

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
      const { id } = req.params;

      const { error } = await database
        .from("pantry_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

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
