import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Columns3,
  Download,
  Users,
} from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import type {
  CompareResult,
  MemberPayStatus,
  MemberRow,
} from "@/lib/compare";
import { cn, formatMoney } from "@/lib/utils";

type CompareResultsProps = {
  result: CompareResult;
  membersFileName: string;
  onDownload: () => void;
};

type Filter = "all" | "Paid" | "Past Due";
type ColumnKey = keyof MemberRow;

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "Customer Name", label: "Customer Name" },
  { key: "Customer Email", label: "Customer Email" },
  { key: "Customer ID", label: "Customer ID" },
  { key: "Amount", label: "Amount" },
  { key: "Currency", label: "Currency" },
  { key: "Type", label: "Type" },
  { key: "Offer Title", label: "Offer Title" },
  { key: "Provider", label: "Provider" },
  { key: "Created At", label: "Created At" },
  { key: "ID", label: "ID" },
  { key: "Previous Note", label: "Previous Note" },
  { key: "Pay Status", label: "Pay Status" },
  { key: "Paid At", label: "Paid At" },
  { key: "Matched Payment ID", label: "Matched Payment ID" },
];

const DEFAULT_VISIBLE: ColumnKey[] = [
  "Customer Name",
  "Customer Email",
  "Amount",
  "Offer Title",
  "Previous Note",
  "Pay Status",
];

export function CompareResults({
  result,
  membersFileName,
  onDownload,
}: CompareResultsProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const currency = result.rows.find((r) => r.Currency)?.Currency || "USD";

  const filtered = useMemo(() => {
    if (filter === "all") return result.rows;
    return result.rows.filter((r) => r["Pay Status"] === filter);
  }, [result.rows, filter]);

  const activeColumns = useMemo(
    () => ALL_COLUMNS.filter((col) => visible.includes(col.key)),
    [visible]
  );

  function toggleColumn(key: ColumnKey) {
    setVisible((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }

  function showAll() {
    setVisible(ALL_COLUMNS.map((c) => c.key));
  }

  function resetColumns() {
    setVisible(DEFAULT_VISIBLE);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 backdrop-blur">
          Compared against{" "}
          <span className="font-semibold text-foreground">{membersFileName}</span>
        </p>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          <Download className="h-4 w-4" />
          Download results XLSX
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard>
          <div className="flex h-full flex-col justify-between gap-4 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Members</p>
              <Users className="h-4 w-4 text-muted" />
            </div>
            <p className="font-mono text-3xl font-semibold tracking-tight">
              <NumberTicker value={result.stats.membersTotal} />
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard>
          <div className="flex h-full flex-col justify-between gap-4 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Paid</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-mono text-3xl font-semibold tracking-tight text-emerald-700">
                <NumberTicker value={result.stats.paid} />
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatMoney(result.stats.paidAmount, currency)}
              </p>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="sm:col-span-2">
          <div className="flex h-full flex-col justify-between gap-4 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Past Due</p>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="font-mono text-3xl font-semibold tracking-tight text-rose-700 sm:text-4xl">
                <NumberTicker value={result.stats.pastDue} />
              </p>
              <p className="text-sm font-medium text-rose-700/80">
                {formatMoney(result.stats.pastDueAmount, currency)} outstanding
              </p>
            </div>
          </div>
        </SpotlightCard>
      </div>

      <SpotlightCard>
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Membership status
              </h2>
              <p className="text-sm text-muted">
                Matched by Customer Email, then Customer ID
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ColumnPicker
                open={columnsOpen}
                onOpenChange={setColumnsOpen}
                visible={visible}
                onToggle={toggleColumn}
                onShowAll={showAll}
                onReset={resetColumns}
              />
              <div className="inline-flex rounded-xl border border-border bg-slate-50 p-1">
                {(
                  [
                    ["all", "All"],
                    ["Paid", "Paid"],
                    ["Past Due", "Past Due"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={
                      filter === id
                        ? "rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-sm"
                        : "rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-auto rounded-xl border border-border">
            <table
              className="w-full text-left text-sm"
              style={{ minWidth: Math.max(640, activeColumns.length * 140) }}
            >
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                <tr>
                  {activeColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={`${row["Customer Email"]}-${i}`}
                    className="border-t border-border transition hover:bg-slate-50/80"
                  >
                    {activeColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.key === "Offer Title" || col.key === "Previous Note"
                            ? "max-w-[220px] truncate"
                            : "whitespace-nowrap",
                          col.key === "Customer Name" && "font-medium",
                          (col.key === "Customer Email" ||
                            col.key === "Previous Note") &&
                            "text-muted",
                          (col.key === "Amount" ||
                            col.key === "ID" ||
                            col.key === "Customer ID" ||
                            col.key === "Matched Payment ID") &&
                            "font-mono"
                        )}
                      >
                        <CellValue column={col.key} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(activeColumns.length, 1)}
                      className="px-4 py-10 text-center text-muted"
                    >
                      No rows in this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

function CellValue({ column, row }: { column: ColumnKey; row: MemberRow }) {
  if (column === "Pay Status") {
    return (
      <StatusBadge status={row["Pay Status"]} paidAt={row["Paid At"]} />
    );
  }
  const value = row[column];
  if (value == null || String(value).trim() === "") return "—";
  return <>{String(value)}</>;
}

function StatusBadge({
  status,
  paidAt,
}: {
  status: MemberPayStatus;
  paidAt?: string;
}) {
  if (status === "Paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#00B050] px-2 py-0.5 font-['Arial',sans-serif] text-xs font-medium text-white">
        Paid
        {paidAt ? <span>· {paidAt}</span> : null}
      </span>
    );
  }
  return (
    <span className="font-['Arial',sans-serif] text-xs font-bold text-red-600">
      Past Due
    </span>
  );
}

function ColumnPicker({
  open,
  onOpenChange,
  visible,
  onToggle,
  onShowAll,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visible: ColumnKey[];
  onToggle: (key: ColumnKey) => void;
  onShowAll: () => void;
  onReset: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-accent/40 hover:bg-accent-soft/30",
          open && "border-accent/40 bg-accent-soft/30"
        )}
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-muted">
          {visible.length}/{ALL_COLUMNS.length}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold">Show columns</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onShowAll}
                className="text-xs font-semibold text-accent hover:underline"
              >
                All
              </button>
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-muted hover:text-foreground hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
          <ul className="max-h-72 overflow-auto p-2">
            {ALL_COLUMNS.map((col) => {
              const checked = visible.includes(col.key);
              return (
                <li key={col.key}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(col.key)}
                      className="h-4 w-4 rounded border-slate-300 text-accent accent-teal-700"
                    />
                    <span className="flex-1 font-medium text-foreground">
                      {col.label}
                    </span>
                    {!DEFAULT_VISIBLE.includes(col.key) ? (
                      <HiddenHint>optional</HiddenHint>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function HiddenHint({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </span>
  );
}
