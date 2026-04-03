import { createAuthClient } from "better-auth/react";
import { apiBaseUrl } from "./api-base-url";

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  fetchOptions: {
    credentials: "include",
  },
});
