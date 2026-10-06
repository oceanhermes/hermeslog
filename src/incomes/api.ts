/**
 * Server functions for the income ledger (Neon Postgres).
 *
 * All DB access lives server-side; the client talks to these via RPC.
 * Zod schemas are shared with the client through validation layer below.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ensureSchema, sql, type IncomeRow } from "@/lib/db";

export type Income = { id: number; date: string; amount: number };

const incomeInputSchema = z.object({
  date: z.string().date("Pilih tanggal yang valid."),
  amount: z.coerce.number().int().positive("Jumlah harus lebih dari Rp0.").max(999_999_999_999),
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

/** List all incomes, newest first. Creates the table on first call. */
export const listIncomes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Income[]> => {
    await ensureSchema();
    const rows = (await sql`
    SELECT id, to_char(date, 'YYYY-MM-DD') AS date, amount
    FROM incomes
    ORDER BY date DESC, id DESC
  `) as IncomeRow[];
    return rows.map((row) => ({ id: row.id, date: row.date, amount: Number(row.amount) }));
  },
);

/** Create a new income entry. */
export const createIncome = createServerFn({ method: "POST" })
  .validator(incomeInputSchema)
  .handler(async ({ data }): Promise<Income> => {
    await ensureSchema();
    const [row] = (await sql`
      INSERT INTO incomes (date, amount)
      VALUES (${data.date}::date, ${data.amount})
      RETURNING id, to_char(date, 'YYYY-MM-DD') AS date, amount
    `) as IncomeRow[];
    if (!row) throw new Error("Gagal membuat pemasukan.");
    return { id: row.id, date: row.date, amount: Number(row.amount) };
  });

/** Update an existing income entry. */
export const updateIncome = createServerFn({ method: "POST" })
  .validator(incomeInputSchema.extend({ id: z.coerce.number().int().positive() }))
  .handler(async ({ data }): Promise<Income> => {
    await ensureSchema();
    const [row] = (await sql`
      UPDATE incomes
      SET date = ${data.date}::date, amount = ${data.amount}
      WHERE id = ${data.id}
      RETURNING id, to_char(date, 'YYYY-MM-DD') AS date, amount
    `) as IncomeRow[];
    if (!row) throw new Error("Pemasukan tidak ditemukan.");
    return { id: row.id, date: row.date, amount: Number(row.amount) };
  });

/** Delete an income entry. Returns the deleted id (throws if missing). */
export const deleteIncome = createServerFn({ method: "POST" })
  .validator(idSchema)
  .handler(async ({ data }): Promise<{ id: number }> => {
    await ensureSchema();
    const [row] = (await sql`
      DELETE FROM incomes WHERE id = ${data.id} RETURNING id
    `) as { id: number }[];
    if (!row) throw new Error("Pemasukan tidak ditemukan.");
    return { id: row.id };
  });
