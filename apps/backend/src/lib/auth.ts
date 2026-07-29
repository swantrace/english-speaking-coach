import { db } from "@english-coach/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const defaultTrustedOrigins = ["http://localhost:5173", "https://english-speaking-coach-2.vercel.app"];

export const authTrustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? defaultTrustedOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";
const authBaseUrl = process.env.BETTER_AUTH_URL ?? (isProduction ? undefined : "http://localhost:3001");
const authSecret =
  process.env.BETTER_AUTH_SECRET ?? (isProduction ? undefined : "development-secret-change-me-before-production-1234");

if (!authBaseUrl || !authSecret) {
  throw new Error("Production auth requires BETTER_AUTH_URL and BETTER_AUTH_SECRET.");
}

const cookieAttributes = {
  sameSite: "lax",
  secure: isProduction,
} as const;

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: cookieAttributes,
    useSecureCookies: isProduction,
  },
  appName: "English Speaking Coach",
  basePath: "/api/auth",
  baseURL: authBaseUrl,
  emailAndPassword: {
    enabled: true,
  },
  secret: authSecret,
  trustedOrigins: authTrustedOrigins,
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "student",
        required: false,
        input: false,
      },
      status: {
        type: "string",
        defaultValue: "pending",
        required: false,
        input: false,
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
