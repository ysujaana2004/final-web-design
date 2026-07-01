const path = require("node:path");
const { FileState, GoogleGenAI, createPartFromUri } = require("@google/genai");

const { env } = require("../lib/env");
const { buildRecipePrompt } = require("./gemini-helpers/recipePrompt");
const { recipeSchema } = require("./gemini-helpers/recipeSchema");

const DEFAULT_MODEL = "gemini-2.5-flash";
const FILE_READY_POLL_MS = 1500;
const FILE_READY_TIMEOUT_MS = 60000;

// This creates the Gemini client only when we actually need it.
function createGeminiClient() {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing from the backend environment.");
  }

  return new GoogleGenAI({
    apiKey: env.geminiApiKey
  });
}

// The downloader currently gives us an mp3, but this helper keeps the service
// ready for a few common audio formats too.
function getAudioMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".mp3") {
    return "audio/mpeg";
  }

  if (extension === ".wav") {
    return "audio/wav";
  }

  if (extension === ".m4a") {
    return "audio/mp4";
  }

  throw new Error(`Unsupported audio file type: ${extension || "unknown"}.`);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Gemini stores uploaded files remotely. We upload the audio first so the model
// can read it in the next step.
async function uploadAudioFile(ai, filePath) {
  return ai.files.upload({
    file: filePath,
    config: {
      displayName: path.basename(filePath),
      mimeType: getAudioMimeType(filePath)
    }
  });
}

// Some files are not ready immediately after upload. This waits until Gemini
// says the file is ready to use.
async function waitForFileToBecomeReady(ai, uploadedFile) {
  if (!uploadedFile?.name) {
    throw new Error("Gemini did not return a file name after upload.");
  }

  const startTime = Date.now();
  let currentFile = uploadedFile;

  while (currentFile.state === FileState.PROCESSING) {
    if (Date.now() - startTime > FILE_READY_TIMEOUT_MS) {
      throw new Error("Timed out while waiting for Gemini to process the audio file.");
    }

    await delay(FILE_READY_POLL_MS);
    currentFile = await ai.files.get({ name: currentFile.name });
  }

  if (currentFile.state === FileState.FAILED) {
    const errorMessage = currentFile.error?.message || "Gemini could not process the audio file.";
    throw new Error(errorMessage);
  }

  if (!currentFile.uri) {
    throw new Error("Gemini finished processing the file, but no file URI was returned.");
  }

  return currentFile;
}

// We ask Gemini for JSON only. This helper makes sure the response really
// matches the simple recipe shape we agreed on.
function validateRecipeObject(recipe) {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) {
    throw new Error("Gemini returned data in the wrong format.");
  }

  if (typeof recipe.title !== "string" || !recipe.title.trim()) {
    throw new Error('Gemini returned an invalid "title" field.');
  }

  if (!Array.isArray(recipe.ingredients)) {
    throw new Error('Gemini returned an invalid "ingredients" field.');
  }

  if (!Array.isArray(recipe.instructions)) {
    throw new Error('Gemini returned an invalid "instructions" field.');
  }

  const invalidIngredient = recipe.ingredients.some((item) => typeof item !== "string");
  if (invalidIngredient) {
    throw new Error('Every "ingredients" item must be a string.');
  }

  const invalidInstruction = recipe.instructions.some((item) => typeof item !== "string");
  if (invalidInstruction) {
    throw new Error('Every "instructions" item must be a string.');
  }

  const normalizedRecipe = {
    title: recipe.title.trim(),
    ingredients: recipe.ingredients.map((item) => item.trim()).filter(Boolean),
    instructions: recipe.instructions.map((item) => item.trim()).filter(Boolean)
  };

  if (normalizedRecipe.ingredients.length === 0) {
    throw new Error("Gemini returned no ingredients.");
  }

  if (normalizedRecipe.instructions.length === 0) {
    throw new Error("Gemini returned no instructions.");
  }

  return normalizedRecipe;
}

function parseRecipeResponse(responseText) {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Gemini returned an empty response.");
  }

  let parsedRecipe;

  try {
    parsedRecipe = JSON.parse(responseText);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  return validateRecipeObject(parsedRecipe);
}

// The uploaded file is temporary for this workflow, so we remove it from
// Gemini after the recipe is created.
async function deleteUploadedFile(ai, uploadedFile) {
  if (!uploadedFile?.name) {
    return;
  }

  try {
    await ai.files.delete({ name: uploadedFile.name });
  } catch {
    // Cleanup should not hide the main result or main error.
  }
}

// Main Gemini flow:
// 1. Upload the audio file
// 2. Wait until Gemini finishes processing it
// 3. Ask for a strict JSON recipe
// 4. Validate the JSON before returning it
// 5. Delete the uploaded Gemini file
async function generateRecipeFromAudio(filePath, options = {}) {
  const ai = createGeminiClient();
  const model = options.model || DEFAULT_MODEL;
  let uploadedFile = null;

  try {
    uploadedFile = await uploadAudioFile(ai, filePath);
    const readyFile = await waitForFileToBecomeReady(ai, uploadedFile);

    const response = await ai.models.generateContent({
      model,
      contents: [
        buildRecipePrompt(),
        createPartFromUri(readyFile.uri, readyFile.mimeType || getAudioMimeType(filePath))
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: recipeSchema
      }
    });

    return parseRecipeResponse(response.text);
  } finally {
    await deleteUploadedFile(ai, uploadedFile);
  }
}

module.exports = {
  createGeminiClient,
  generateRecipeFromAudio,
  getAudioMimeType,
  parseRecipeResponse,
  validateRecipeObject,
  waitForFileToBecomeReady
};
