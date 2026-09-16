import axios from "axios";

// Get a free API key from https://www.themoviedb.org/settings/api
const API_KEY = "ddf5724768b00aee5a7630ebe654913d";
const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
export const ORIGINAL_IMAGE_URL = "https://image.tmdb.org/t/p/original";

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: "en-US",
  },
});

export const endpoints = {
  trending: "/trending/movie/week",
  topRated: "/movie/top_rated",
  action: "/discover/movie?with_genres=28",
  comedy: "/discover/movie?with_genres=35",
  horror: "/discover/movie?with_genres=27",
};

export const fetchMovies = async (endpoint: string) => {
  try {
    const response = await tmdb.get(endpoint);
    return response.data.results;
  } catch (error) {
    console.error("Error fetching movies:", error);
    return [];
  }
};

export const fetchMovieTrailer = async (movieId: number) => {
  try {
    const response = await tmdb.get(`/movie/${movieId}/videos`);
    const trailers = response.data.results.filter(
      (video: any) => video.type === "Trailer" && video.site === "YouTube",
    );
    return trailers.length > 0 ? trailers[0].key : null;
  } catch (error) {
    console.error("Error fetching trailer:", error);
    return null;
  }
};
