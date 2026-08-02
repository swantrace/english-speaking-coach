import { z } from "zod";

export const mediaAccessResponseSchema = z.object({
  contentType: z.string().min(1),
  expiresAt: z.string().datetime(),
  url: z.url(),
});

export type MediaAccessResponse = z.infer<typeof mediaAccessResponseSchema>;
