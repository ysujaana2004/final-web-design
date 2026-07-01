const express = require("express");

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

function isClientInputError(error) {
  return Boolean(error?.message && CLIENT_INPUT_ERRORS.has(error.message));
}

function createRecipesRouter(dependencies = {}) {
  const router = express.Router();
  const download = dependencies.downloadAudio || downloadAudio;
  const cleanup = dependencies.cleanupDownloadedAudio || cleanupDownloadedAudio;
  const generate = dependencies.generateRecipeFromAudio || generateRecipeFromAudio;

  router.post("/", async (req, res, next) => {
    const videoUrl = req.body?.videoUrl;

    if (typeof videoUrl !== "string" || !videoUrl.trim()) {
      res.status(400).json({
        error: 'A non-empty "videoUrl" string is required.'
      });
      return;
    }

    let downloadedAudio = null;

    try {
      downloadedAudio = await download(videoUrl);
      const recipe = await generate(downloadedAudio.filePath);

      res.status(201).json({
        sourceUrl: downloadedAudio.sourceUrl,
        recipe
      });
    } catch (error) {
      if (isClientInputError(error)) {
        res.status(400).json({
          error: error.message
        });
        return;
      }

      next(error);
    } finally {
      // Downloader output is temporary, so we always try to remove it once
      // Gemini is done or once an error is returned to the client.
      try {
        await cleanup(downloadedAudio?.tempDirectory);
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
module.exports.createRecipesRouter = createRecipesRouter;
