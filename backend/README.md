## Backend

This backend is scaffolded for Node.js with Express.

Current status:
- Node project structure is in place
- API routes are wired up
- Downloader service can extract temporary audio from TikTok and Instagram video URLs
- Remaining feature modules are placeholders only

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `backend/.env.example` to `backend/.env`.

3. Start the server:

```bash
npm run dev
```

Default server URL: `http://localhost:3001`

Node version:
- Use Node 20 or newer

### Downloader requirements

The downloader service shells out to `yt-dlp` and expects `ffmpeg` to be available on the machine.

Data flow:
- input: TikTok or Instagram video URL
- downloader: produces a temporary audio file on disk
- later step: Gemini can consume that audio file and generate a structured recipe

### Gemini requirements

- Set `GEMINI_API_KEY` in `backend/.env`
- The Gemini service takes an audio file and returns:
  - `title`
  - `ingredients`
  - `instructions`
