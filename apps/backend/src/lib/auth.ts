import { db } from "@english-coach/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const authTrustedOrigins = ["http://localhost:5173", "https://english-speaking-coach.com"];

const isProduction = process.env.NODE_ENV === "production";
const localCookieAttributes = {
  sameSite: "lax",
  secure: false,
} as const;

const productionCookieAttributes = {
  domain: "english-speaking-coach.com",
  sameSite: "none",
  secure: true,
} as const;

export const auth = betterAuth({
  advanced: {
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: "english-speaking-coach.com",
    },
    defaultCookieAttributes: isProduction ? productionCookieAttributes : localCookieAttributes,
    useSecureCookies: isProduction,
  },
  appName: "English Speaking Coach",
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "development-secret-change-me-before-production-1234",
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
