import axios from "axios";

// Kapag naka-deploy sa Vercel, gagamitin nito ang VERCEL_URL backend o default live API url.
// Pwede mo ring palitan ang fallback URL dito sa sarili mong deployed backend link.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:5000/api";

const TMDB_API_KEY =
  process.env.NEXT_PUBLIC_TMDB_KEY ||
  process.env.EXPO_PUBLIC_TMDB_KEY ||
  "YOUR_TMDB_API_KEY_HERE"; // Palitan ng TMDB API Key mo kung wala ka pang .env

// ==========================================
// 1. AUTHENTICATION & SYNC
// ==========================================
export const loginOrRegister = async (email: string, password: string) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register-or-login`, {
    email,
    password,
  });
  if (response.data.token) {
    localStorage.setItem("zpk_token", response.data.token);
    localStorage.setItem("zpk_user", JSON.stringify(response.data.user));
  }
  return response.data;
};

export const syncUserData = async (
  myList: any[],
  continueWatching: any[] = [],
) => {
  const token = localStorage.getItem("zpk_token");
  if (!token) return;

  const response = await axios.post(
    `${API_BASE_URL}/user/sync-list`,
    { myList, continueWatching },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
};

export const logoutUser = () => {
  localStorage.removeItem("zpk_token");
  localStorage.removeItem("zpk_user");
};

// ==========================================
// 2. TMDB SEARCH (Kasama ang Anime & KDrama)
// ==========================================
export const searchMultiMedia = async (query: string) => {
  if (!query) return [];
  try {
    // GAMITIN ANG /search/multi sa halip na /search/movie
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query,
      )}&include_adult=false&language=en-US&page=1`,
    );

    // Filter para Movies at TV Shows lang (isasantabi ang person/actor results)
    const filteredResults = response.data.results.filter(
      (item: any) => item.media_type === "movie" || item.media_type === "tv",
    );

    return filteredResults;
  } catch (error) {
    console.error("Error fetching multi search from TMDB:", error);
    return [];
  }
};
