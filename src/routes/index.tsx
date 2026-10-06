import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Plus, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";

type Income = { id: number; date: string; amount: number };

const initialIncome: Income[] = [
  { id: 1, date: "2026-10-06", amount: 500_000 },
  { id: 2, date: "2026-10-05", amount: 250_000 },
  { id: 3, date: "2026-10-03", amount: 1_000_000 },
];

const incomeSchema = z.object({
  date: z.string().date("Pilih tanggal yang valid."),
  amount: z.coerce.number().int().positive("Jumlah harus lebih dari Rp0.").max(999_999_999_999),
});

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const rupiah = { format: (value: number) => `Rp${numberFormat.format(value)}` };

const longDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lekas Ledger — Pelacak Pemasukan" },
      { name: "description", content: "Pantau total, tren, dan riwayat pemasukan dalam Rupiah." },
      { property: "og:title", content: "Lekas Ledger — Pelacak Pemasukan" },
      { property: "og:description", content: "Pantau total, tren, dan riwayat pemasukan dalam Rupiah." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncomeDashboard,
});

function IncomeDashboard() {
  const [records, setRecords] = useState(initialIncome);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [date, setDate] = useState("2026-10-06");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(
    () =>
      records
        .filter((item) => (!from || item.date >= from) && (!to || item.date <= to))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [records, from, to],
  );

  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const largest = filtered.reduce((max, item) => Math.max(max, item.amount), 0);
  const average = filtered.length ? Math.round(total / filtered.length) : 0;
  const chartRecords = [...filtered].reverse();
  const chartMax = Math.max(...chartRecords.map((item) => item.amount), 1);

  function addIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = incomeSchema.safeParse({ date, amount });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Periksa kembali data pemasukan.");
      return;
    }
    setRecords((current) => [
      ...current,
      { id: Date.now(), date: result.data.date, amount: result.data.amount },
    ]);
    setAmount("");
    setError("");
    setIsAdding(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-40 h-[420px] w-[820px] rotate-[22deg] bg-foreground/[0.035] backdrop-blur-2xl ring-1 ring-border" />
      <div className="pointer-events-none absolute -right-40 top-24 h-[520px] w-[760px] rotate-[22deg] bg-primary/[0.04] backdrop-blur-xl ring-1 ring-border" />

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">L</span>
            <div>
              <p className="text-sm font-medium">Lekas Ledger</p>
              <p className="text-xs text-muted-foreground sm:hidden">Catatan pemasukan</p>
            </div>
          </div>
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Pemasukan · IDR</span>
        </header>

        <section className="dashboard-rise relative mt-8 overflow-hidden rounded-xl bg-card backdrop-blur-2xl ring-1 ring-border">
          <div className="pointer-events-none absolute -top-16 right-0 h-[280px] w-[420px] rotate-[18deg] bg-primary/10 backdrop-blur-xl ring-1 ring-border" />
          <div className="relative grid gap-8 p-6 sm:p-9 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-medium uppercase text-primary">Total pemasukan</p>
              <p className="mt-3 text-4xl font-semibold leading-none text-balance sm:text-6xl">{rupiah.format(total)}</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                {filtered.length} transaksi tercatat{from || to ? " dalam rentang pilihan" : " secara keseluruhan"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Metric label="Rata-rata" value={rupiah.format(average)} />
              <Metric label="Terbesar" value={rupiah.format(largest)} />
            </div>
          </div>
        </section>

        <section className="dashboard-rise mt-6 rounded-xl bg-card p-5 backdrop-blur-2xl ring-1 ring-border sm:p-8 [animation-delay:80ms]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium">Tren pemasukan</p>
              <p className="mt-1 text-xs text-muted-foreground">Perubahan pemasukan dari waktu ke waktu</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DateField label="Dari" value={from} onChange={setFrom} max={to || undefined} />
              <DateField label="Sampai" value={to} onChange={setTo} min={from || undefined} />
            </div>
          </div>
          <div className="mt-7 flex h-36 items-end gap-3 border-b border-border px-2" aria-label="Grafik tren pemasukan">
            {chartRecords.length ? chartRecords.map((item) => (
              <div key={item.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="hidden text-[10px] text-primary sm:block">{rupiah.format(item.amount)}</span>
                <div className="w-full max-w-24 rounded-t-md bg-primary/80 transition-[height]" style={{ height: `${Math.max(12, (item.amount / chartMax) * 92)}px` }} />
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">{Number(item.date.slice(-2))} Okt</span>
              </div>
            )) : <p className="m-auto text-sm text-muted-foreground">Tidak ada pemasukan pada periode ini.</p>}
          </div>
        </section>

        <section className="dashboard-rise mt-6 overflow-hidden rounded-xl bg-card backdrop-blur-2xl ring-1 ring-border [animation-delay:160ms]">
          <div className="flex items-center justify-between gap-4 border-b border-border p-5 sm:p-8">
            <div>
              <p className="text-sm font-medium">Riwayat transaksi</p>
              <p className="mt-1 text-xs text-muted-foreground">Terbaru ditampilkan lebih dulu</p>
            </div>
            <Button onClick={() => setIsAdding(true)}><Plus className="size-4" /> <span className="hidden sm:inline">Tambah pemasukan</span><span className="sm:hidden">Tambah</span></Button>
          </div>
          <div className="p-2 sm:p-3">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-4 ring-1 ring-border transition-colors hover:bg-secondary/60 sm:px-5">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-medium text-muted-foreground">{Number(item.date.slice(-2))}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{longDate.format(new Date(`${item.date}T00:00:00Z`))}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Pemasukan</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums text-primary sm:text-lg">{rupiah.format(item.amount)}</p>
              </div>
            ))}
            {!filtered.length && <p className="py-12 text-center text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</p>}
          </div>
        </section>
        <p className="mt-8 text-center text-xs text-muted-foreground">Lekas Ledger · catatan pemasukan harian</p>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsAdding(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-title" className="w-full max-w-md rounded-xl bg-popover p-6 text-popover-foreground shadow-2xl ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div><p id="add-title" className="text-lg font-semibold">Tambah pemasukan</p><p className="mt-1 text-sm text-muted-foreground">Catat uang yang baru diterima.</p></div>
              <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => setIsAdding(false)}><X className="size-4" /></Button>
            </div>
            <form className="mt-6 space-y-5" onSubmit={addIncome}>
              <label className="block text-sm font-medium">Tanggal<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-11 w-full rounded-lg bg-secondary px-3 text-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="block text-sm font-medium">Jumlah (IDR)<div className="relative mt-2"><span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">Rp</span><input required inputMode="numeric" min="1" max="999999999999" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="500000" className="h-11 w-full rounded-lg bg-secondary pl-10 pr-3 text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" /></div></label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Batal</Button><Button type="submit">Simpan pemasukan</Button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-36 rounded-xl bg-secondary/70 px-5 py-3 ring-1 ring-border"><p className="text-[11px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-lg font-medium tabular-nums">{value}</p></div>;
}

function DateField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string | undefined; max?: string | undefined }) {
  return <label className="text-xs font-medium text-muted-foreground"><span className="mb-1.5 flex items-center gap-1"><CalendarDays className="size-3" />{label}</span><input type="date" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg bg-secondary px-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-ring sm:px-3 sm:text-sm" /></label>;
}