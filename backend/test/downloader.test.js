const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeVideoUrl,
  parseDownloadedFilePath
} = require("../src/services/downloader");

test("normalizeVideoUrl accepts TikTok and Instagram URLs", () => {
  assert.equal(
    normalizeVideoUrl("https://www.instagram.com/reel/abc123/"),
    "https://www.instagram.com/reel/abc123/"
  );
  assert.equal(
    normalizeVideoUrl("https://www.tiktok.com/@creator/video/1234567890"),
    "https://www.tiktok.com/@creator/video/1234567890"
  );
});

test("normalizeVideoUrl rejects unsupported hosts", () => {
  assert.throws(
    () => normalizeVideoUrl("https://www.youtube.com/watch?v=123"),
    /Only TikTok and Instagram video URLs are supported/
  );
});

test("parseDownloadedFilePath returns the last non-empty line", () => {
  const stdout = "\n[download] 100%\n/private/tmp/make-me-a-sandwich-123/audio.mp3\n";

  assert.equal(
    parseDownloadedFilePath(stdout),
    "/private/tmp/make-me-a-sandwich-123/audio.mp3"
  );
});
﻿
