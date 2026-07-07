const express = require("express");

const { env } = require("../lib/env");
const { supabase } = require("../lib/db");
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

// The downloader already throws a few clear validation errors for bad URLs.
// Those should come back to the client as 400s instead of generic 500s.
function isClientInputError(error) {
  return Boolean(error?.message && CLIENT_INPUT_ERRORS.has(error.message));
}

function resolveRecipeOwnerId(requestBody = {}) {
  const bodyUserId = typeof requestBody.user_id === "string"
    ? requestBody.user_id.trim()
    : "";

  if (bodyUserId) {
    return bodyUserId;
  }

  return env.devTestUserId || null;
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

  const ingredientRows = recipe.ingredients.map((rawText) => ({
    recipe_id: savedRecipe.id,
    raw_text: rawText
  }));

  const { error: ingredientError } = await database
    .from("recipe_ingredients")
    .insert(ingredientRows);

  if (ingredientError) {
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

function createRecipesRouter(dependencies = {}) {
  const router = express.Router();
  const download = dependencies.downloadAudio || downloadAudio; // Use an injected fake in tests, otherwise the real downloader.
  const cleanup = dependencies.cleanupDownloadedAudio || cleanupDownloadedAudio; // Same pattern for temp-file cleanup.
  const generate = dependencies.generateRecipeFromAudio || generateRecipeFromAudio; // Same pattern for the Gemini step.
  const saveRecipe = dependencies.saveGeneratedRecipe || saveGeneratedRecipe;

  router.post("/", async (req, res, next) => {
    const videoUrl = req.body?.videoUrl; // Avoids crashing if req.body is missing entirely.
    const userId = resolveRecipeOwnerId(req.body);

    if (typeof videoUrl !== "string" || !videoUrl.trim()) {
      res.status(400).json({
        error: 'A non-empty "videoUrl" string is required.'
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        error: 'A "user_id" is required unless DEV_TEST_USER_ID is configured.'
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
      });

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
