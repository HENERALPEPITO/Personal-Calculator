import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { DISPLAY_COLUMNS, type OrderRow, type ProcessStats } from "@/lib/process";

type ResultsTableProps = {
  rows: OrderRow[];
  stats: ProcessStats;
};

function statusVariant(status: string) {
  const s = status.toLowerCase();
  if (s.includes("success") || s.includes("paid") || s.includes("completed")) {
    return "success" as const;
  }
  if (s.includes("pending")) return "warning" as const;
  if (s.includes("fail") || s.includes("cancel")) return "danger" as const;
  return "muted" as const;
}

function formatCell(col: string, value: unknown) {
  if (col === "Created At" && value) {
    const d = new Date(value as string | number | Date);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return String(value ?? "");
}

export function ResultsTable({ rows, stats }: ResultsTableProps) {
  return (
    <div className="space-y-4">
      <SpotlightCard>
        <details className="group p-5">
          <summary className="cursor-pointer list-none font-semibold tracking-tight">
            <span className="flex items-center justify-between gap-3">
              Processing summary
              <span className="text-sm font-normal text-muted group-open:hidden">
                Show details
              </span>
            </span>
          </summary>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>
              Started with{" "}
              <strong className="text-foreground">{stats.initialCount}</strong> rows
            </li>
            <li>
              Removed{" "}
              <strong className="text-foreground">{stats.failedRemoved}</strong>{" "}
              failed status row(s)
            </li>
            <li>
              Removed{" "}
              <strong className="text-foreground">
                {stats.refundPairsRemoved}
              </strong>{" "}
              row(s) as refund ↔ payment pairs
            </li>
            <li>
              Left with{" "}
              <strong className="text-foreground">{stats.finalCount}</strong>{" "}
              order(s)
            </li>
          </ul>
        </details>
      </SpotlightCard>

      <SpotlightCard>
        <div className="p-5 pb-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Remaining rows
              </h2>
              <p className="text-sm text-muted">{rows.length} records after cleanup</p>
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-auto border-t border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr>
                {DISPLAY_COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.ID}-${i}`}
                  className="border-t border-border transition hover:bg-slate-50/80"
                >
                  {DISPLAY_COLUMNS.map((col) => (
                    <td key={col} className="whitespace-nowrap px-4 py-3">
                      {col === "Status" ? (
                        <Badge variant={statusVariant(String(row.Status))}>
                          {String(row.Status || "—")}
                        </Badge>
                      ) : col === "Type" ? (
                        <Badge variant="default">{String(row.Type || "—")}</Badge>
                      ) : col === "Amount" ? (
                        <span className="font-mono font-medium">
                          {formatCell(col, row[col])}
                        </span>
                      ) : (
                        formatCell(col, row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={DISPLAY_COLUMNS.length}
                    className="px-4 py-10 text-center text-muted"
                  >
                    No rows remaining after cleanup.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
