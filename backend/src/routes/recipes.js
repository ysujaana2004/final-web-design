const express = require("express");

const { supabase } = require("../lib/db");
const { resolveOrCreateIngredientId } = require("../lib/ingredients");
const {
  downloadAudio,
  cleanupDownloadedAudio
} = require("../services/downloader");
const { generateRecipeFromAudio } = require("../services/gemini");

const CLIENT_INPUT_ERRORS = new Set([
  "A video URL is required.",
  "The video URL is not valid.",
  "Only TikTok and Instagram video URLs are supported."
]);

const RECIPE_SELECT = `
  id,
  created_by,
  title,
  source_url,
  instructions,
  created_at,
  recipe_ingredients (
    id,
    ingredient_id,
    raw_text,
    quantity,
    unit,
    ingredients (
      name
    )
  )
`;

// The downloader already throws a few clear validation errors for bad URLs.
// Those should come back to the client as 400s instead of generic 500s.
function isClientInputError(error) {
  return Boolean(error?.message && CLIENT_INPUT_ERRORS.has(error.message));
}

function normalizeUserId(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function resolveRecipeOwnerId(request = {}) {
  return normalizeUserId(request.user?.id) || null;
}

async function saveGeneratedRecipe({
  sourceUrl,
  recipe,
  userId
}, database = supabase) {
  const recipeRow = {
    title: recipe.title,
    instructions: recipe.instructions,
    source_url: sourceUrl,
    created_by: userId
  };

  const { data: savedRecipe, error: recipeError } = await database
    .from("recipes")
    .insert(recipeRow)
    .select("id")
    .single();

  if (recipeError) {
    throw recipeError;
  }

  try {
    const ingredientRows = await Promise.all(
      recipe.ingredients.map(async (rawText) => ({
        recipe_id: savedRecipe.id,
        ingredient_id: await resolveOrCreateIngredientId(rawText, database),
        raw_text: rawText
      }))
    );

    const { error: ingredientError } = await database
      .from("recipe_ingredients")
      .insert(ingredientRows);

    if (ingredientError) {
      throw ingredientError;
    }
  } catch (ingredientError) {
    try {
      await database
        .from("recipes")
        .delete()
        .eq("id", savedRecipe.id);
    } catch {
      // Best-effort cleanup only. The insert error is still the main failure.
    }

    throw ingredientError;
  }

  return savedRecipe;
}

async function buildRecipeIngredientRows(recipeId, ingredientLines, database = supabase) {
  return Promise.all(
    ingredientLines.map(async (rawText) => ({
      recipe_id: recipeId,
      ingredient_id: await resolveOrCreateIngredientId(rawText, database),
      raw_text: rawText
    }))
  );
}

function createRecipesRouter(dependencies = {}) {
  const router = express.Router();
  const download = dependencies.downloadAudio || downloadAudio; // Use an injected fake in tests, otherwise the real downloader.
  const cleanup = dependencies.cleanupDownloadedAudio || cleanupDownloadedAudio; // Same pattern for temp-file cleanup.
  const generate = dependencies.generateRecipeFromAudio || generateRecipeFromAudio; // Same pattern for the Gemini step.
  const saveRecipe = dependencies.saveGeneratedRecipe || saveGeneratedRecipe;
  const database = dependencies.supabase || supabase;

  // GET /api/recipes
  router.get("/", async (req, res, next) => {
    try {
      const userId = resolveRecipeOwnerId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { data, error } = await requestDatabase
        .from("recipes")
        .select(RECIPE_SELECT)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({
        status: "ok",
        data
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/recipes/:id
  router.get("/:id", async (req, res, next) => {
    try {
      const userId = resolveRecipeOwnerId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const { data, error } = await requestDatabase
        .from("recipes")
        .select(RECIPE_SELECT)
        .eq("id", req.params.id)
        .eq("created_by", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: "Recipe not found"
        });
      }

      res.json({
        status: "ok",
        data
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const videoUrl = req.body?.videoUrl; // Avoids crashing if req.body is missing entirely.
    const userId = resolveRecipeOwnerId(req);
    const requestDatabase = req.supabase || database;

    if (!userId) {
      res.status(401).json({
        error: "Authentication is required."
      });
      return;
    }

    if (typeof videoUrl !== "string" || !videoUrl.trim()) {
      res.status(400).json({
        error: 'A non-empty "videoUrl" string is required.'
      });
      return;
    }

    let downloadedAudio = null; // Declared outside try so finally can still see it.

    try {
      // Main happy path:
      // 1. Download audio from the supported social video URL
      // 2. Ask Gemini to turn that audio into recipe JSON
      downloadedAudio = await download(videoUrl);
      const recipe = await generate(downloadedAudio.filePath); // Gemini reads the saved audio file, not the original video URL.
      const savedRecipe = await saveRecipe({
        sourceUrl: downloadedAudio.sourceUrl,
        recipe,
        userId
      }, requestDatabase);

      res.status(201).json({
        sourceUrl: downloadedAudio.sourceUrl,
        recipe,
        recipeId: savedRecipe.id
      });
    } catch (error) {
      // Bad input should be reported clearly to the frontend so it can
      // prompt the user to fix the submitted URL.
      if (isClientInputError(error)) {
        res.status(400).json({
          error: error.message
        });
        return;
      }

      next(error); // Let the app-level error middleware turn unexpected failures into a 500 response.
    } finally {
      // Downloader output is temporary, so we always try to remove it once
      // Gemini is done or once an error is returned to the client.
      try {
        await cleanup(downloadedAudio?.tempDirectory); // If download failed early, this passes undefined and cleanup simply does nothing.
      } catch {
        // Cleanup failure should not replace the main result or main error.
      }
    }
  });

  // PUT /api/recipes/:id
  router.put("/:id", async (req, res, next) => {
    try {
      const userId = resolveRecipeOwnerId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const updateFields = {};

      if (typeof req.body?.title === "string") {
        const title = req.body.title.trim();

        if (!title) {
          return res.status(400).json({
            error: "title cannot be empty"
          });
        }

        updateFields.title = title;
      }

      if (req.body?.source_url !== undefined) {
        updateFields.source_url = typeof req.body.source_url === "string" && req.body.source_url.trim()
          ? req.body.source_url.trim()
          : null;
      }

      if (req.body?.instructions !== undefined) {
        if (!Array.isArray(req.body.instructions) || req.body.instructions.length === 0) {
          return res.status(400).json({
            error: "instructions must be a non-empty array of strings"
          });
        }

        const instructions = req.body.instructions
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);

        if (instructions.length === 0 || instructions.length !== req.body.instructions.length) {
          return res.status(400).json({
            error: "instructions must be a non-empty array of strings"
          });
        }

        updateFields.instructions = instructions;
      }

      const shouldReplaceIngredients = req.body?.ingredients !== undefined;
      let ingredientRows = null;

      if (shouldReplaceIngredients) {
        if (!Array.isArray(req.body.ingredients) || req.body.ingredients.length === 0) {
          return res.status(400).json({
            error: "ingredients must be a non-empty array of strings"
          });
        }

        const ingredientLines = req.body.ingredients
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);

        if (ingredientLines.length === 0 || ingredientLines.length !== req.body.ingredients.length) {
          return res.status(400).json({
            error: "ingredients must be a non-empty array of strings"
          });
        }

        // Build the replacement rows before deleting anything.
        ingredientRows = await buildRecipeIngredientRows(req.params.id, ingredientLines, requestDatabase);
      }

      if (Object.keys(updateFields).length === 0 && !shouldReplaceIngredients) {
        return res.status(400).json({
          error: "At least one updatable field is required"
        });
      }

      // First confirm the recipe belongs to this user.
      const { data: existingRecipe, error: existingRecipeError } = await requestDatabase
        .from("recipes")
        .select("id")
        .eq("id", req.params.id)
        .eq("created_by", userId)
        .maybeSingle();

      if (existingRecipeError) throw existingRecipeError;

      if (!existingRecipe) {
        return res.status(404).json({
          error: "Recipe not found"
        });
      }

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await requestDatabase
          .from("recipes")
          .update(updateFields)
          .eq("id", req.params.id)
          .eq("created_by", userId);

        if (updateError) throw updateError;
      }

      if (shouldReplaceIngredients) {
        const { error: deleteIngredientsError } = await requestDatabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", req.params.id);

        if (deleteIngredientsError) throw deleteIngredientsError;

        const { error: insertIngredientsError } = await requestDatabase
          .from("recipe_ingredients")
          .insert(ingredientRows);

        if (insertIngredientsError) throw insertIngredientsError;
      }

      const { data, error } = await requestDatabase
        .from("recipes")
        .select(RECIPE_SELECT)
        .eq("id", req.params.id)
        .eq("created_by", userId)
        .maybeSingle();

      if (error) throw error;

      res.json({
        status: "ok",
        data
      });
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/recipes/:id
  router.delete("/:id", async (req, res, next) => {
    try {
      const userId = resolveRecipeOwnerId(req);
      const requestDatabase = req.supabase || database;

      if (!userId) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      // Remove dependent ingredient rows before the recipe.
      const { data: recipeToDelete, error: recipeLookupError } = await requestDatabase
        .from("recipes")
        .select("id")
        .eq("id", req.params.id)
        .eq("created_by", userId)
        .maybeSingle();

      if (recipeLookupError) throw recipeLookupError;

      if (!recipeToDelete) {
        return res.status(404).json({
          error: "Recipe not found"
        });
      }

      const { error: deleteIngredientsError } = await requestDatabase
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", req.params.id);

      if (deleteIngredientsError) throw deleteIngredientsError;

      const { error: deleteRecipeError } = await requestDatabase
        .from("recipes")
        .delete()
        .eq("id", req.params.id)
        .eq("created_by", userId);

      if (deleteRecipeError) throw deleteRecipeError;

      res.json({
        status: "ok",
        message: "Recipe deleted"
      });
    } catch (error) {
      next(error);
    }
  });

  router.all("*", (_req, res) => {
    res.status(404).json({
      message: "Recipe route not found."
    });
  });

  return router;
}

module.exports = createRecipesRouter();
module.exports.createRecipesRouter = createRecipesRouter; // Exported separately so unit tests can build the router with mocked dependencies.
module.exports.resolveRecipeOwnerId = resolveRecipeOwnerId;
module.exports.saveGeneratedRecipe = saveGeneratedRecipe;
module.exports.buildRecipeIngredientRows = buildRecipeIngredientRows;
