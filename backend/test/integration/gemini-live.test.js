const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { generateRecipeFromAudio } = require("../../src/services/gemini");

const testAudioFile = process.env.TEST_AUDIO_FILE;

test("generateRecipeFromAudio manual smoke test", { skip: !testAudioFile }, async () => {
  assert.ok(testAudioFile, "TEST_AUDIO_FILE is required");

  const audioFilePath = path.resolve(process.cwd(), testAudioFile);
  const result = await generateRecipeFromAudio(audioFilePath);

  assert.ok(result, "Gemini should return a recipe object");
  console.log(JSON.stringify(result, null, 2));
});
