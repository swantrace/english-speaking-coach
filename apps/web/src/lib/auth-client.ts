import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || undefined;

export type AuthClient = ReturnType<typeof createAuthClient>;

export const authClient: AuthClient = createAuthClient({
  baseURL,
});
