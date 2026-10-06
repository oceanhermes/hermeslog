/**
 * Integration check for the lazy Neon proxy (src/lib/db.ts).
 *
 * - Skips automatically when DATABASE_URL is unavailable (CI without env).
 * - Locally it loads .env.local so `vitest run` just works.
 */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

if (!process.env["DATABASE_URL"]) {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      const key = match?.[1];
      const value = match?.[2];
      if (key && value !== undefined) process.env[key] ??= value;
    }
  } catch {
    // no .env.local — the test below skips
  }
}

const hasDb = Boolean(process.env["DATABASE_URL"]);
const d = hasDb ? it : it.skip;

d("lazy sql proxy runs a real tagged-template query", async () => {
  const { sql } = await import("@/lib/db");
  const rows = (await sql`SELECT 1 AS one`) as Array<{ one: number }>;
  expect(rows[0]?.one).toBe(1);
});

d("lazy sql proxy exposes driver methods (query)", async () => {
  const { sql } = await import("@/lib/db");
  expect(typeof (sql as unknown as Record<string, unknown>)["query"]).toBe("function");
});
