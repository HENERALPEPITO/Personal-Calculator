import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn, formatMoney } from "@/lib/utils";
import { dateKey, groupSum, type OrderRow } from "@/lib/process";

const COLORS = [
  "#0f766e",
  "#ea580c",
  "#2563eb",
  "#ca8a04",
  "#7c3aed",
  "#db2777",
  "#0891b2",
];

type ChartMode = "type" | "status" | "daily";

type ResultsChartProps = {
  rows: OrderRow[];
};

export function ResultsChart({ rows }: ResultsChartProps) {
  const [mode, setMode] = useState<ChartMode>("type");

  const data = useMemo(() => {
    if (mode === "status") {
      return groupSum(rows, (r) => String(r.Status || "Unknown")).map(
        ([name, value]) => ({ name, value })
      );
    }
    if (mode === "daily") {
      return groupSum(rows, (r) => dateKey(r["Created At"]))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, value]) => ({ name, value }));
    }
    return groupSum(rows, (r) => String(r.Type || "Unknown")).map(
      ([name, value]) => ({ name, value })
    );
  }, [rows, mode]);

  const tabs: { id: ChartMode; label: string }[] = [
    { id: "type", label: "By Type" },
    { id: "status", label: "By Status" },
    { id: "daily", label: "By Date" },
  ];

  return (
    <SpotlightCard>
      <div className="space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Breakdown</h2>
            <p className="text-sm text-muted">Visualize remaining order value</p>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-slate-50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  mode === tab.id
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "daily" ? (
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatMoney(Number(v))}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                />
                <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={104}
                  paddingAngle={3}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        {mode !== "daily" && data.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted">{item.name}</span>
                <span className="font-mono text-xs font-medium">
                  {formatMoney(item.value)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SpotlightCard>
  );
}
