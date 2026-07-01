const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAudioMimeType,
  parseRecipeResponse,
  validateRecipeObject
} = require("../../src/services/gemini");

test("getAudioMimeType returns the right mime type for mp3", () => {
  assert.equal(getAudioMimeType("/tmp/audio.mp3"), "audio/mpeg");
});

test("validateRecipeObject trims and keeps the agreed recipe shape", () => {
  const recipe = validateRecipeObject({
    title: "  Garlic Pasta  ",
    ingredients: [" 8 oz pasta ", " 2 cloves garlic "],
    instructions: [" Boil pasta. ", " Mix with garlic. "]
  });

  assert.deepEqual(recipe, {
    title: "Garlic Pasta",
    ingredients: ["8 oz pasta", "2 cloves garlic"],
    instructions: ["Boil pasta.", "Mix with garlic."]
  });
});

test("parseRecipeResponse rejects invalid JSON", () => {
  assert.throws(() => parseRecipeResponse("not-json"), /Gemini returned invalid JSON/);
});

test("parseRecipeResponse rejects recipes with missing fields", () => {
  assert.throws(
    () => parseRecipeResponse(JSON.stringify({ title: "Toast", ingredients: ["Bread"] })),
    /instructions/
  );
});