import { useMemo, useState } from "react";
import { CalendarDays, Hash, Wallet } from "lucide-react";
import { ResultsChart } from "@/components/results-chart";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import {
  groupRowsByMonth,
  sumRowAmounts,
  type OrderRow,
} from "@/lib/process";
import { cn, formatMoney } from "@/lib/utils";

type MonthlyPaymentReportsProps = {
  rows: OrderRow[];
  currency?: string;
};

export function MonthlyPaymentReports({
  rows,
  currency,
}: MonthlyPaymentReportsProps) {
  const months = useMemo(() => groupRowsByMonth(rows), [rows]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const overallAmount = useMemo(() => sumRowAmounts(rows), [rows]);
  const monthsSumAmount = useMemo(
    () => months.reduce((sum, m) => sum + m.totalAmount, 0),
    [months]
  );
  const monthsSumOrders = useMemo(
    () => months.reduce((sum, m) => sum + m.count, 0),
    [months]
  );

  const selectedKey =
    activeKey && months.some((m) => m.key === activeKey)
      ? activeKey
      : (months[0]?.key ?? null);

  const selected = months.find((m) => m.key === selectedKey) ?? null;

  // Recompute from the selected month's rows so UI always matches the filter
  const selectedAmount = selected ? sumRowAmounts(selected.rows) : 0;
  const selectedOrders = selected?.rows.length ?? 0;

  if (!months.length) {
    return (
      <SpotlightCard>
        <p className="p-6 text-sm text-muted">No cleaned payments to report.</p>
      </SpotlightCard>
    );
  }

  const reconciled =
    monthsSumOrders === rows.length &&
    Math.abs(monthsSumAmount - overallAmount) < 0.005;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Monthly reports
          </h3>
          <p className="text-xs text-muted">
            Each order counted once by Created At calendar month ·{" "}
            {months.length} month{months.length === 1 ? "" : "s"}
          </p>
        </div>
        <p
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-semibold",
            reconciled
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          )}
        >
          {reconciled
            ? `Months sum to ${monthsSumOrders} orders · ${formatMoney(monthsSumAmount, currency)}`
            : `Mismatch: months ${monthsSumOrders}/${formatMoney(monthsSumAmount, currency)} vs overall ${rows.length}/${formatMoney(overallAmount, currency)}`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {months.map((month) => {
          const active = month.key === selectedKey;
          return (
            <button
              key={month.key}
              type="button"
              onClick={() => setActiveKey(month.key)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                active
                  ? "border-accent bg-accent-soft/50 shadow-sm"
                  : "border-border bg-white/80 hover:border-accent/40 hover:bg-slate-50/80"
              )}
            >
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <CalendarDays className="h-3.5 w-3.5" />
                {month.label}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Total Amount
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-foreground">
                    {formatMoney(month.totalAmount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Total Orders
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-foreground">
                    {month.count}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SpotlightCard>
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-medium text-muted">
                    {selected.label} · Total Amount
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                    {formatMoney(selectedAmount, currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-accent p-2.5 text-white">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
            </SpotlightCard>
            <SpotlightCard>
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-medium text-muted">
                    {selected.label} · Total Orders
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                    {selectedOrders}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                  <Hash className="h-4 w-4" />
                </div>
              </div>
            </SpotlightCard>
          </div>
          <ResultsChart key={selected.key} rows={selected.rows} />
        </div>
      ) : null}
    </div>
  );
}
