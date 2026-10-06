/**
 * Neon Postgres connection (serverless HTTP driver).
 *
 * The pooled connection string comes from DATABASE_URL (.env.local locally,
 * hosting env in production). The HTTP-based serverless driver works in
 * workers/serverless runtimes — no TCP sockets needed.
 */
import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

const url = process.env["DATABASE_URL"];

/**
 * Lazily-created Neon client.
 *
 * The proxy keeps importing this module side-effect free (unit tests and
 * client bundles can import the route tree without DATABASE_URL — the first
 * actual query is what fails without one). The proxy target MUST be callable
 * so tagged-template calls (`sql\`...\``) route through the apply trap;
 * otherwise calls throw "sql is not a function".
 */
let client: NeonSql | undefined;

function getClient(): NeonSql {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (local) or your hosting env (production).",
    );
  }
  client ??= neon(url);
  return client;
}

export const sql: NeonSql = new Proxy(
  (() => {
    throw new Error("Neon client accessed before initialization.");
  }) as unknown as NeonSql,
  {
    apply(_target, thisArg, args) {
      return Reflect.apply(getClient(), thisArg, args);
    },
    get(_target, prop) {
      const c = getClient() as unknown as Record<string | symbol, unknown>;
      const value = c[prop];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value;
    },
    has(_target, prop) {
      return prop in getClient();
    },
  },
);

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
