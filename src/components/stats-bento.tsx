import { ArrowDownRight, Hash, Wallet } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { formatMoney } from "@/lib/utils";
import type { ProcessStats } from "@/lib/process";

type StatsBentoProps = {
  stats: ProcessStats;
  currency?: string;
};

export function StatsBento({ stats, currency }: StatsBentoProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SpotlightCard className="sm:col-span-2">
        <div className="flex h-full flex-col justify-between gap-6 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Amount</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {formatMoney(stats.totalAmount, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-accent p-2.5 text-white shadow-md shadow-teal-900/15">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm text-muted">
            After removing failed rows and refund ↔ payment pairs
          </p>
        </div>
      </SpotlightCard>

      <SpotlightCard>
        <div className="flex h-full flex-col justify-between gap-4 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Total Orders</p>
            <Hash className="h-4 w-4 text-muted" />
          </div>
          <p className="font-mono text-3xl font-semibold tracking-tight">
            <NumberTicker value={stats.finalCount} />
          </p>
        </div>
      </SpotlightCard>

      <SpotlightCard>
        <div className="flex h-full flex-col justify-between gap-4 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Cleaned</p>
            <ArrowDownRight className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold tracking-tight">
              <NumberTicker
                value={stats.failedRemoved + stats.refundPairsRemoved}
              />
            </p>
            <p className="mt-1 text-xs text-muted">
              {stats.failedRemoved} failed · {stats.refundPairsRemoved} pairs
            </p>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
