import { supabase } from "./supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function request(path, options = {}) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  return request("/pantry");
}

export function createPantryItem({ ingredient, quantity, unit }) {
  return request("/pantry", {
    method: "POST",
    body: JSON.stringify({
      ingredient,
      quantity,
      unit,
    }),
  });
}

export function deletePantryItem(id) {
  return request(`/pantry/${id}`, {
    method: "DELETE",
  });
}

export function getGroceries() {
  return request("/groceries");
}

export function getRecipes() {
  return request("/recipes");
}

export function getRecipeById(id) {
  return request(`/recipes/${id}`);
}

export function createRecipeFromVideo(videoUrl) {
  return request("/recipes", {
    method: "POST",
    body: JSON.stringify({
      videoUrl,
    }),
  });
}

export function deleteRecipe(id) {
  return request(`/recipes/${id}`, {
    method: "DELETE",
  });
}
