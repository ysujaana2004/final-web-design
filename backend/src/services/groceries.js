/*
Purpose:
- Own the groceries recommendation logic for the backend.
- Keep pantry-vs-recipe comparison and ranking out of the Express route.

What needs to be done:
- Fetch the user's pantry ingredient ids.
- Fetch the user's saved recipes with their recipe_ingredients rows.
- Compare pantry ingredients against recipe ingredients.
- Keep only recipes that are missing exactly one ingredient in v1.
- Aggregate missing ingredients into ranked grocery recommendations.
- Return structured rows with ingredient id/name, unlock count, and unlocked recipe ids/titles.
- Expose small service functions that are easy to unit test directly.
*/

module.exports = {};
