# final-web-design

# Make Me A Sandwich

This web application generates users personalized grocery lists
based on their social media cooking preferences and their existing pantry.

If you cook often, you likely browse cooking content on your social media platforms such as Instagram and TikTok quite frequently. As you see videos of recipes you think you'd like,
you might save them or like them or comment, but oftentimes,
the recipes become a jumbled mess as you lose track of those videos. Not to mention that you might not even have a lot of the igredients required for many of these recipes.

Make Me A Sandwich solves these problems by tailoring your grocery list to these videos and the items you already have in these pantries. The only info you need to share are the links to the recipe videos and the ingredients you already have at home. Our system does the rest.

# Inputs: links to social media recipe videos, ingredients already in the user's pantry

# Outputs: Formatted recipes generated from the videos, a grocery list which prioritizes ingredients which would "unlock" the greatest number of recipes based on what the user already has

# Tech Stack

Frontend: React, Vite
Backend: Python, FastAPI
Database: Supabase (PostgreSQL)

Tools:
Gemini API (for converting video transcript into structured recipe)
External API to transcribe social media links (TBD)
