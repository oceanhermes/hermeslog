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
      { title: "Income Flow — Pelacak Pemasukan" },
      { name: "description", content: "Pantau total, tren, dan riwayat pemasukan dalam Rupiah." },
      { property: "og:title", content: "Income Flow — Pelacak Pemasukan" },
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20">I</span>
            <div>
              <h1 className="text-lg font-bold sm:text-xl">Income Flow</h1>
              <p className="text-xs text-muted-foreground sm:hidden">Pelacak pemasukan</p>
            </div>
          </div>
          <span className="text-xs font-semibold uppercase text-muted-foreground sm:text-sm">Pemasukan · IDR</span>
        </header>

        <section className="dashboard-rise mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 md:col-span-2">
            <div className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full bg-accent blur-3xl" />
            <div className="relative">
              <p className="text-xs font-bold uppercase text-primary">Total pemasukan</p>
              <p className="mt-3 text-4xl font-extrabold leading-none text-balance sm:text-5xl">{rupiah.format(total)}</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                {filtered.length} transaksi tercatat{from || to ? " dalam rentang pilihan" : " secara keseluruhan"}.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
            <Metric label="Rata-rata" value={rupiah.format(average)} />
            <Metric label="Tertinggi" value={rupiah.format(largest)} accent />
          </div>
        </section>

        <section className="dashboard-rise mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8 [animation-delay:80ms]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Tren pemasukan</h2>
              <p className="mt-1 text-sm text-muted-foreground">Perubahan pemasukan dari waktu ke waktu</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField label="Dari" value={from} onChange={setFrom} max={to || undefined} />
              <DateField label="Sampai" value={to} onChange={setTo} min={from || undefined} />
            </div>
          </div>
          <div className="mt-8 flex h-48 items-end gap-4 border-b border-border px-2 sm:px-6" aria-label="Grafik tren pemasukan">
            {chartRecords.length ? chartRecords.map((item) => (
              <div key={item.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3">
                <span className="hidden text-[10px] font-bold text-primary sm:block">{rupiah.format(item.amount)}</span>
                <div className="w-full max-w-24 rounded-t-2xl bg-primary shadow-lg shadow-primary/10 transition-[height]" style={{ height: `${Math.max(16, (item.amount / chartMax) * 120)}px`, opacity: 0.45 + (item.amount / chartMax) * 0.55 }} />
                <span className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground">{Number(item.date.slice(-2))} Okt</span>
              </div>
            )) : <p className="m-auto text-sm text-muted-foreground">Tidak ada pemasukan pada periode ini.</p>}
          </div>
        </section>

        <section className="dashboard-rise mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8 [animation-delay:160ms]">
          <div className="flex items-center justify-between gap-4 pb-6 sm:pb-8">
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Riwayat transaksi</h2>
              <p className="mt-1 text-sm text-muted-foreground">Terbaru ditampilkan lebih dulu</p>
            </div>
            <Button className="h-11 rounded-2xl px-4 shadow-lg shadow-primary/20 sm:px-6" onClick={() => setIsAdding(true)}><Plus className="size-4" /> <span className="hidden sm:inline">Tambah pemasukan</span><span className="sm:hidden">Tambah</span></Button>
          </div>
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-border hover:bg-secondary sm:p-5">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground sm:size-12 sm:rounded-2xl">{Number(item.date.slice(-2))}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{longDate.format(new Date(`${item.date}T00:00:00Z`))}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Pemasukan</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums sm:text-lg">{rupiah.format(item.amount)}</p>
              </div>
            ))}
            {!filtered.length && <p className="py-12 text-center text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</p>}
          </div>
        </section>
        <p className="mt-8 text-center text-xs font-medium text-muted-foreground">Income Flow · catatan pemasukan harian</p>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsAdding(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-title" className="w-full max-w-md rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
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

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="flex min-w-0 flex-col justify-center rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6"><p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p><p className={`mt-1 truncate text-base font-bold tabular-nums sm:text-xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</p></div>;
}

function DateField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string | undefined; max?: string | undefined }) {
  return <label className="relative mt-2 text-xs font-bold text-muted-foreground"><span className="absolute -top-2 left-3 z-10 flex items-center gap-1 bg-card px-1"><CalendarDays className="size-3" />{label}</span><input type="date" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl bg-secondary px-3 text-xs font-medium text-secondary-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-ring sm:w-40 sm:text-sm" /></label>;
}