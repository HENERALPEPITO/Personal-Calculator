import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { FileDropzone } from "@/components/file-dropzone";
import { ResultsTable } from "@/components/results-table";
import { StatsBento } from "@/components/stats-bento";
import { CompareResults } from "@/components/compare-results";
import { MonthlyPaymentReports } from "@/components/monthly-payment-reports";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import {
  compareMembersToPayments,
  compareResultToXlsx,
  type CompareResult,
} from "@/lib/compare";
import { parseSpreadsheet } from "@/lib/parseFile";
import { processRows, type ProcessResult } from "@/lib/process";

type Step = "source" | "reference" | "done";

export default function App() {
  const [step, setStep] = useState<Step>("source");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [membersName, setMembersName] = useState<string | null>(null);
  const [sourceResult, setSourceResult] = useState<ProcessResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  async function handleSource(file: File) {
    setError(null);
    if (!isSpreadsheet(file)) {
      setError("Please upload a .csv, .xlsx, or .xls file.");
      return;
    }

    setLoading(true);
    try {
      const rawRows = await parseSpreadsheet(file);
      const processed = processRows(rawRows);
      setSourceResult(processed);
      setSourceName(file.name);
      setCompareResult(null);
      setMembersName(null);
      setStep("reference");
    } catch (err) {
      console.error(err);
      setSourceResult(null);
      setSourceName(null);
      setError(err instanceof Error ? err.message : "Could not process source file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReference(file: File) {
    setError(null);
    if (!sourceResult) {
      setError("Upload the payment source file first.");
      return;
    }
    if (!isSpreadsheet(file)) {
      setError("Please upload a .csv, .xlsx, or .xls file.");
      return;
    }

    setLoading(true);
    try {
      const rawRows = await parseSpreadsheet(file);
      const compared = compareMembersToPayments(rawRows, sourceResult.rows);
      setCompareResult(compared);
      setMembersName(file.name);
      setStep("done");
    } catch (err) {
      console.error(err);
      setCompareResult(null);
      setMembersName(null);
      setError(
        err instanceof Error ? err.message : "Could not process members file."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setStep("source");
    setSourceResult(null);
    setCompareResult(null);
    setSourceName(null);
    setMembersName(null);
    setError(null);
  }

  async function downloadCompareXlsx() {
    if (!compareResult) return;
    const blob = await compareResultToXlsx(compareResult.rows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "membership-pay-status.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  const currency =
    sourceResult?.rows.find((r) => r.Currency)?.Currency?.toString() || "USD";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 12% -10%, rgba(15,118,110,0.14), transparent 55%), radial-gradient(700px 420px at 95% 0%, rgba(234,88,12,0.1), transparent 50%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 10%, transparent 70%)",
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-xs font-semibold text-accent shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Client-side · nothing leaves your browser
          </div>
          <div>
            <p className="font-sans text-4xl font-bold tracking-tight text-accent sm:text-5xl">
              Order Calculator
            </p>
            <h1 className="mt-3 max-w-2xl text-lg font-medium text-foreground sm:text-xl">
              Clean payment exports, then check monthly members for Paid vs Past
              Due.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
              Step 1: payment source (failed + refund pairs removed). Step 2:
              members roster — matched by email / customer ID.
            </p>
          </div>
        </motion.header>

        <StepIndicator step={step} sourceName={sourceName} membersName={membersName} />

        <div className="mt-6 space-y-5">
          <AnimatePresence mode="wait">
            {step === "source" ? (
              <motion.div
                key="source"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <FileDropzone
                  stepLabel="Step 1 · Payment source"
                  title="Drop payment CSV / XLSX"
                  hint="Needs Amount, Type, Status — failed rows and refund pairs are cleaned automatically"
                  onFile={handleSource}
                  loading={loading}
                  error={error}
                />
              </motion.div>
            ) : null}

            {step === "reference" && sourceResult ? (
              <motion.div
                key="reference"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <SourceSummary
                  fileName={sourceName}
                  result={sourceResult}
                  currency={currency}
                  onReset={resetAll}
                />
                <FileDropzone
                  stepLabel="Step 2 · Members reference"
                  title="Drop monthly members CSV / XLSX"
                  hint="Needs Customer Email — each member is marked Paid if found in cleaned payments, otherwise Past Due"
                  onFile={handleReference}
                  loading={loading}
                  error={error}
                />
                <details className="rounded-2xl border border-border bg-white/70 p-4 text-sm text-muted backdrop-blur">
                  <summary className="cursor-pointer font-semibold text-foreground">
                    Preview cleaned payment totals
                  </summary>
                  <div className="mt-4 space-y-4">
                    <StatsBento stats={sourceResult.stats} currency={currency} />
                    <MonthlyPaymentReports
                      rows={sourceResult.rows}
                      currency={currency}
                    />
                  </div>
                </details>
              </motion.div>
            ) : null}

            {step === "done" && sourceResult && compareResult && membersName ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SourceSummary
                    fileName={sourceName}
                    result={sourceResult}
                    currency={currency}
                    compact
                  />
                  <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-accent/40 hover:bg-accent-soft/40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Start over
                  </button>
                </div>

                <CompareResults
                  result={compareResult}
                  membersFileName={membersName}
                  onDownload={downloadCompareXlsx}
                />

                <details className="rounded-2xl border border-border bg-white/70 p-4 backdrop-blur">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Cleaned payment source details
                  </summary>
                  <div className="mt-4 space-y-4">
                    <StatsBento stats={sourceResult.stats} currency={currency} />
                    <MonthlyPaymentReports
                      rows={sourceResult.rows}
                      currency={currency}
                    />
                    <ResultsTable
                      rows={sourceResult.rows}
                      stats={sourceResult.stats}
                    />
                  </div>
                </details>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function isSpreadsheet(file: File) {
  return /\.(csv|xlsx|xls)$/i.test(file.name);
}

function StepIndicator({
  step,
  sourceName,
  membersName,
}: {
  step: Step;
  sourceName: string | null;
  membersName: string | null;
}) {
  const items = [
    {
      id: "source" as const,
      label: "Payment source",
      done: step !== "source",
      detail: sourceName,
    },
    {
      id: "reference" as const,
      label: "Members roster",
      done: step === "done",
      detail: membersName,
    },
    {
      id: "done" as const,
      label: "Paid / Past Due",
      done: step === "done",
      detail: step === "done" ? "Ready" : null,
    },
  ];

  return (
    <SpotlightCard>
      <ol className="grid gap-3 p-4 sm:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              className={
                item.done || step === item.id
                  ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white"
                  : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xs font-bold text-muted"
              }
            >
              {item.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="truncate text-xs text-muted">
                {item.detail || (step === item.id ? "In progress" : "Waiting")}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SpotlightCard>
  );
}

function SourceSummary({
  fileName,
  result,
  currency,
  onReset,
  compact,
}: {
  fileName: string | null;
  result: ProcessResult;
  currency: string;
  onReset?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-border bg-white/80 px-3 py-2 text-sm backdrop-blur"
          : "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/80 p-4 backdrop-blur"
      }
    >
      <div>
        <p className="text-sm font-medium text-slate-600">
          Source{" "}
          <span className="font-semibold text-foreground">{fileName}</span>
        </p>
        <p className="text-xs text-muted">
          {result.stats.finalCount} cleaned payments ·{" "}
          {formatInline(result.stats.totalAmount, currency)}
        </p>
      </div>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Change source
        </button>
      ) : null}
    </div>
  );
}

function formatInline(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: /^[A-Z]{3}$/i.test(currency) ? currency.toUpperCase() : "USD",
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}
