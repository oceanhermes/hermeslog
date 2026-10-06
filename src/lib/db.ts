/**
 * Neon Postgres connection (serverless HTTP driver).
 *
 * The pooled connection string comes from DATABASE_URL (.env.local locally,
 * hosting env in production). The HTTP-based serverless driver works in
 * workers/serverless runtimes — no TCP sockets needed.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env["DATABASE_URL"];

/**
 * The driver is created lazily so importing this module never throws (unit
 * tests and edge environments without DATABASE_URL can still import the
 * route tree). The first actual query is the thing that fails without a URL.
 */
let cached: ReturnType<typeof neon> | undefined;

function getUrl(): string {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (local) or your hosting env (production).",
    );
  }
  return url;
}

// Tagged-template + query() access on the pooled endpoint.
export const sql: ReturnType<typeof neon> = new Proxy({} as ReturnType<typeof neon>, {
  get(_target, prop, receiver) {
    cached ??= neon(getUrl());
    return Reflect.get(cached as object, prop, receiver);
  },
});

export type IncomeRow = {
  id: number;
  date: string;
  amount: string | number;
  created_at?: Date;
};

/** Create the incomes table if it does not exist yet (idempotent). */
export async function ensureSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS incomes (
      id          SERIAL PRIMARY KEY,
      date        DATE NOT NULL,
      amount      BIGINT NOT NULL CHECK (amount > 0),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}
