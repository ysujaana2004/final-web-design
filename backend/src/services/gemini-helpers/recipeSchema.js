// This schema describes the exact recipe shape we want back from Gemini.
// Keeping it small makes the first version easier to validate and render.
const recipeSchema = {
  type: "object",
  required: ["title", "ingredients", "instructions"],
  properties: {
    title: {
      type: "string",
      description: "The name of the recipe."
    },
    ingredients: {
      type: "array",
      description: "A list of ingredient lines.",
      items: {
        type: "string"
      }
    },
    instructions: {
      type: "array",
      description: "A list of step-by-step cooking instructions.",
      items: {
        type: "string"
      }
    }
  }
};

// This gives the app a simple example of the exact response shape.
const recipeExample = {
  title: "Garlic Butter Pasta",
  ingredients: [
    "8 oz pasta",
    "3 tbsp butter",
    "4 cloves garlic",
    "Salt to taste"
  ],
  instructions: [
    "Boil the pasta until tender.",
    "Melt the butter and cook the garlic briefly.",
    "Toss the pasta with the garlic butter and season with salt."
  ]
};

module.exports = {
  recipeExample,
  recipeSchema
};
