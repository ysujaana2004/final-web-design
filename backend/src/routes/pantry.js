const express = require("express");
const { supabase } = require("../lib/db");

const router = express.Router();

// GET /api/pantry
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
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
    console.log("POST /api/pantry reached");
  try {
    const { ingredient, quantity, unit } = req.body;

    if (!ingredient || !quantity) {
      return res.status(400).json({
        error: "ingredient and quantity are required"
      });
    }

    // 1. find ingredient id
    const { data: ingredientData, error: ingredientError } = await supabase
      .from("ingredients")
      .select("id")
      .eq("name", ingredient.toLowerCase())
      .single();

    if (ingredientError) throw ingredientError;

    // 2. insert pantry item
    const { data, error } = await supabase
      .from("pantry_items")
      .insert([
        {
          user_id: req.body.user_id, 
          ingredient_id: ingredientData.id,
          quantity,
          unit: unit || null
        }
      ])
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

    const { data, error } = await supabase
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

    const { error } = await supabase
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
module.exports = router;
