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
  if (import.meta.env.DEV) {
    console.debug("Outgoing API request", {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data,
      headers: config.headers,
    });
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.debug("Incoming API response", {
        method: response.config.method,
        url: response.config.url,
        status: response.status,
        data: response.data,
        headers: response.headers,
      });
    }
    return response;
  },
  async (error) => {
    return Promise.reject(error);
  },
);

export const isAxiosError = axios.isAxiosError;
