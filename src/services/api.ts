import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

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
