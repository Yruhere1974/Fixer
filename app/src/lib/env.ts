import { z } from "zod";

/**
 * Environment is validated once at startup (Next.js standard: "typed and validated at startup").
 * A missing/blank DATABASE_URL fails fast rather than surfacing as an opaque runtime error.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
