import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || undefined;

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  // Keep this interceptor lightweight; auth cookies are sent via withCredentials.
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error);
  },
);
