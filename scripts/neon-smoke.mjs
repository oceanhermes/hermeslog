/**
 * Smoke test against the real Neon database (run manually):
 *   node --env-file=.env.local scripts/neon-smoke.mjs
 * Verifies connectivity + that the incomes table matches app expectations.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS incomes (
    id         SERIAL PRIMARY KEY,
    date       DATE NOT NULL,
    amount     BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const rows = await sql`SELECT id, to_char(date, 'YYYY-MM-DD') AS date, amount FROM incomes ORDER BY date DESC, id DESC`;
console.log("NEON_OK — rows:", rows.length);
for (const row of rows) console.log(`  ${row.id} · ${row.date} · Rp${Number(row.amount).toLocaleString("id-ID")}`);
