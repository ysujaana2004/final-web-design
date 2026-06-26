const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

// Only these sites are allowed because this service is meant for recipe videos
// coming from TikTok and Instagram.
const SUPPORTED_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com"
]);

// This makes sure we were given a real URL and that it comes from a supported site.
function normalizeVideoUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== "string") {
    throw new Error("A video URL is required.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    throw new Error("The video URL is not valid.");
  }

  if (!SUPPORTED_HOSTS.has(parsedUrl.hostname)) {
    throw new Error("Only TikTok and Instagram video URLs are supported.");
  }

  return parsedUrl.toString();
}

// yt-dlp prints a few lines while it works. The last useful line should be the
// saved file path, so we pull that out here.
function parseDownloadedFilePath(stdout) {
  const outputLines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return outputLines.at(-1) || null;
}

// Each download gets its own temporary folder so the audio file is easy to
// find and easy to delete later.
async function createTemporaryAudioDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), "make-me-a-sandwich-"));
}

// This runs yt-dlp as a separate system process and waits for it to finish.
function runYtDlp(videoUrl, outputTemplate) {
  const args = [
    "--no-playlist",
    "--no-progress",
    "--extract-audio",
    "--audio-format",
    "mp3",
    "--output",
    outputTemplate,
    "--print",
    "after_move:filepath",
    videoUrl
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      // ENOENT usually means the yt-dlp command could not be found on the machine.
      if (error.code === "ENOENT") {
        reject(new Error("yt-dlp is not installed or not available on PATH."));
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}.`));
        return;
      }

      const filePath = parseDownloadedFilePath(stdout);

      if (!filePath) {
        reject(new Error("yt-dlp completed, but no audio file path was returned."));
        return;
      }

      resolve(filePath);
    });
  });
}

// Main downloader flow:
// 1. Validate input URL
// 2. Create temporary folder
// 3. Ask yt-dlp to save the audio file there
// 4. Return the file details so the next step can send the audio to Gemini
async function downloadAudio(videoUrl) {
  const normalizedUrl = normalizeVideoUrl(videoUrl);
  const tempDirectory = await createTemporaryAudioDirectory();
  const outputTemplate = path.join(tempDirectory, "audio.%(ext)s");

  try {
    const filePath = await runYtDlp(normalizedUrl, outputTemplate);

    return {
      sourceUrl: normalizedUrl,
      filePath,
      tempDirectory
    };
  } catch (error) {
    // If the download fails, remove the temporary folder so we dont leave junk behind.
    await fs.rm(tempDirectory, { recursive: true, force: true });
    throw error;
  }
}

// After another part of the app finishes using the audio file, it can call this
// to clean up the temporary folder.
async function cleanupDownloadedAudio(tempDirectory) {
  if (!tempDirectory) {
    return;
  }

  await fs.rm(tempDirectory, { recursive: true, force: true });
}

module.exports = {
  cleanupDownloadedAudio,
  downloadAudio,
  normalizeVideoUrl,
  parseDownloadedFilePath
};
