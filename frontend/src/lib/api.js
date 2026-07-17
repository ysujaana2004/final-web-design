const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

const USER_ID = import.meta.env.VITE_DEV_USER_ID || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || body.message || "Request failed");
  }

  return body;
}

export function getPantryItems() {
  return request(`/pantry?user_id=${encodeURIComponent(USER_ID)}`);
}

export function createPantryItem({ ingredient, quantity, unit }) {
  return request("/pantry", {
    method: "POST",
    body: JSON.stringify({
      user_id: USER_ID,
      ingredient,
      quantity,
      unit,
    }),
  });
}

export function deletePantryItem(id) {
  return request(`/pantry/${id}?user_id=${encodeURIComponent(USER_ID)}`, {
    method: "DELETE",
  });
}

export function getGroceries() {
  return request(`/groceries?user_id=${encodeURIComponent(USER_ID)}`);
}

export function getRecipes() {
  return request(`/recipes?user_id=${encodeURIComponent(USER_ID)}`);
}

export function createRecipeFromVideo(videoUrl) {
  return request("/recipes", {
    method: "POST",
    body: JSON.stringify({
      user_id: USER_ID,
      videoUrl,
    }),
  });
}

export function deleteRecipe(id) {
  return request(`/recipes/${id}?user_id=${encodeURIComponent(USER_ID)}`, {
    method: "DELETE",
  });
}