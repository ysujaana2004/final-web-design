# final-web-design

# Make Me A Sandwich

This web application generates users personalized grocery lists
based on their social media cooking preferences and their existing pantry.

If you cook often, you likely browse cooking content on your social media platforms such as Instagram and TikTok quite frequently. As you see videos of recipes you think you'd like,
you might save them or like them or comment, but oftentimes,
the recipes become a jumbled mess as you lose track of those videos. Not to mention that you might not even have a lot of the igredients required for many of these recipes.

Make Me A Sandwich solves these problems by tailoring your grocery list to these videos and the items you already have in these pantries. The only info you need to share are the links to the recipe videos and the ingredients you already have at home. Our system does the rest.

## Inputs/Outputs

Inputs: links to social media recipe videos, ingredients already in the user's pantry

Outputs: Formatted recipes generated from the videos, a grocery list which prioritizes ingredients which would "unlock" the greatest number of recipes based on what the user already has

## Requirements

- Node.js 22 or newer
- Docker Desktop or Docker Engine with Compose support (optional)

## Tech Stack

Frontend: React, Vite
Backend: Node.js, Express
Database: Supabase (PostgreSQL)

Tools:
Gemini API (for converting video audio into structured recipe)
External API to  social media links (TBD)

## Docker

This repo now includes Docker support for both the frontend and backend.

Services:
- Frontend: served at `http://localhost:8080`
- Backend API: served at `http://localhost:3001`

Before starting:
- Make sure `backend/.env` exists and contains `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `GEMINI_API_KEY`
- Make sure `frontend/.env` exists and contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Keep `VITE_API_BASE_URL=http://localhost:3001/api` for the Docker setup

Run:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

Notes:
- The frontend runs in the browser and calls the backend at `http://localhost:3001/api`
- The backend container includes both `ffmpeg` and `yt-dlp`
- The existing non-Docker workflow still works unchanged
