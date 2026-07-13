## Backend

This backend is scaffolded for Node.js with Express.

Current status:
- Node project structure is in place
- API routes are wired up
- Downloader service can extract temporary audio from TikTok and Instagram video URLs
- `POST /api/recipes` can turn a supported video URL into recipe JSON
- Recipe CRUD is implemented and scoped by `user_id`
- Pantry CRUD is implemented and scoped by `user_id`
- Auth, users, and groceries are still placeholders only

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

Example request body:

```json
{
  "videoUrl": "https://www.instagram.com/reel/abc123/",
  "user_id": "your-profile-uuid"
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
- `GET /api/recipes?user_id=...` returns only that user's recipes
- `GET /api/recipes/:id?user_id=...` returns one owned recipe
- `PUT /api/recipes/:id` updates one owned recipe; send `user_id` plus any of `title`, `source_url`, `instructions`, `ingredients`
- `DELETE /api/recipes/:id?user_id=...` deletes one owned recipe

### Pantry endpoints

- `GET /api/pantry?user_id=...` returns only that user's pantry items
- `GET /api/pantry/:id?user_id=...` returns one owned pantry item
- `POST /api/pantry` creates one pantry item; send `user_id` and `ingredient`
- `PUT /api/pantry/:id` updates one owned pantry item; send `user_id` plus `quantity` and/or `unit`
- `DELETE /api/pantry/:id?user_id=...` deletes one owned pantry item
- Pantry routes fall back to `DEV_TEST_USER_ID` when `user_id` is omitted

### Groceries implementation notes

Purpose:
- Add a read-only `GET /api/groceries` endpoint for ranked grocery recommendations.

What needs to be done:
- Implement the route in `src/routes/groceries.js`.
- Implement the comparison and ranking logic in `src/services/groceries.js`.
- Add route tests in `test/unit/groceries-route.test.js`.
- Add service tests in `test/unit/groceries-service.test.js`.
- Return structured recommendation rows so the frontend can render strings like `tomatoes (unlocks 5 recipes)`.
