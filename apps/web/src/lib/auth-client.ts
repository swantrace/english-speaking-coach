import { createAuthClient } from "better-auth/react";
import { apiBaseUrl } from "./api-base-url";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: apiBaseUrl,
  fetchOptions: {
    credentials: "include",
  },
});
