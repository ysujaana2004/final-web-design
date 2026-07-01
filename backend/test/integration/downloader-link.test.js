const test = require("node:test");
const assert = require("node:assert/strict");

const {
  downloadAudio,
  cleanupDownloadedAudio
} = require("../../src/services/downloader");

const testUrl = process.env.TEST_URL;

test("downloadAudio manual smoke test", { skip: !testUrl }, async () => {
  assert.ok(testUrl, "TEST_URL is required");

  const result = await downloadAudio(testUrl);
  console.log(result);

  // Leave this commented if you want to inspect the mp3 manually first.
  // await cleanupDownloadedAudio(result.tempDirectory);
});
