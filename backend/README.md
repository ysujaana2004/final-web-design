## Backend

This backend is scaffolded for Node.js with Express.

Current status:
- Node project structure is in place
- API routes are wired up
- Downloader service can extract temporary audio from TikTok and Instagram video URLs
- `POST /api/recipes` can turn a supported video URL into recipe JSON
- Recipe, pantry, and grocery routes require a verified Supabase access token
- The backend derives the user from that token; it never accepts a caller-supplied owner ID

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
- Use Node 22 or newer

### Tests

- `npm test` runs the offline unit tests in `test/unit`
- `npm run test:integration` runs the opt-in integration tests in `test/integration`
- `npm run test:all` runs both suites

Integration notes:
- `test/integration/downloader-link.test.js` is skipped unless `TEST_URL` is set
- `test/integration/gemini-live.test.js` is skipped unless `TEST_AUDIO_FILE` is set
- Gemini integration tests also require `GEMINI_API_KEY` in `backend/.env` or the shell environment

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

### Recipe endpoint

`POST /api/recipes`

All recipe, pantry, grocery, and database-health routes require this header:

```http
Authorization: Bearer <supabase-access-token>
```

Example request body:

```json
{
  "videoUrl": "https://www.instagram.com/reel/abc123/"
}
```

Example response shape:

```json
{
  "sourceUrl": "https://www.instagram.com/reel/abc123/",
  "recipe": {
    "title": "Garlic Butter Pasta",
    "ingredients": ["8 oz pasta", "3 tbsp butter"],
    "instructions": ["Boil the pasta.", "Toss with the butter."]
  }
}
```

Other recipe routes:
- `GET /api/recipes` returns only the authenticated user's recipes
- `GET /api/recipes/:id` returns one owned recipe
- `PUT /api/recipes/:id` updates one owned recipe; send any of `title`, `source_url`, `instructions`, `ingredients`
- `DELETE /api/recipes/:id` deletes one owned recipe

### Pantry endpoints

- `GET /api/pantry` returns only the authenticated user's pantry items
- `GET /api/pantry/:id` returns one owned pantry item
- `POST /api/pantry` creates one pantry item; send `ingredient`
- `PUT /api/pantry/:id` updates one owned pantry item; send `quantity` and/or `unit`
- `DELETE /api/pantry/:id` deletes one owned pantry item

### Groceries implementation notes

Purpose:
- Add a read-only `GET /api/groceries` endpoint for ranked grocery recommendations.

The endpoint is implemented in `src/routes/groceries.js` and returns recommendations only for the authenticated user's pantry and recipes.
