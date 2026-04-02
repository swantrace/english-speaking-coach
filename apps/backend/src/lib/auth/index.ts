import { db } from "@english-coach/database";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createAuthOptions } from "./options";

export const auth = betterAuth(
  createAuthOptions(
    drizzleAdapter(db, {
      provider: "sqlite",
    }),
  ),
);

export type Session = typeof auth.$Infer.Session;
