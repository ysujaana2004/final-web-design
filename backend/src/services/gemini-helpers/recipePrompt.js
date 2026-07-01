const { recipeExample } = require("./recipeSchema");

// This prompt tells Gemini exactly what kind of output we want from the audio.
// The goal is to make the response easy for the backend to parse.
function buildRecipePrompt() {
  return `
You are given cooking audio from a recipe video.

Your job is to extract a recipe from the audio.

Return only valid JSON.
Do not return markdown.
Do not add explanation before or after the JSON.

The JSON must use exactly these fields:
- "title": a string
- "ingredients": an array of strings
- "instructions": an array of strings

Rules:
- Keep the title short and clear.
- Each ingredient should be one string in the ingredients array.
- Each cooking step should be one string in the instructions array.
- If some details are unclear, do your best with the information in the audio.
- Do not invent unrelated details.

Example output:
${JSON.stringify(recipeExample, null, 2)}
`.trim();
}

module.exports = { buildRecipePrompt };
