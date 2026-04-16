import type { Auth } from "@english-coach/backend/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || undefined;

type AuthClientOptions = {
  baseURL?: string;
  plugins: [ReturnType<typeof inferAdditionalFields<Auth>>];
};

export type AuthClient = ReturnType<typeof createAuthClient<AuthClientOptions>>;
export type AuthSession = AuthClient["$Infer"]["Session"];
export type AuthSessionUser = AuthSession["user"];

export const authClient: AuthClient = createAuthClient({
  baseURL,
  plugins: [inferAdditionalFields<Auth>()],
});
