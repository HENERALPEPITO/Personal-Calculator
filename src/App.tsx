import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import { FileDropzone } from "@/components/file-dropzone";
import { ResultsChart } from "@/components/results-chart";
import { ResultsTable } from "@/components/results-table";
import { StatsBento } from "@/components/stats-bento";
import { processRows, type ProcessResult } from "@/lib/process";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(lower)) {
      setError("Please upload a .csv, .xlsx, or .xls file.");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("Workbook has no sheets.");
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const processed = processRows(rawRows);
      setResult(processed);
      setFileName(file.name);
    } catch (err) {
      console.error(err);
      setResult(null);
      setFileName(null);
      setError(err instanceof Error ? err.message : "Could not process that file.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setFileName(null);
    setError(null);
  }

  const currency =
    result?.rows.find((r) => r.Currency)?.Currency?.toString() || "USD";

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
              Upload payments. Strip failures and cancelled refunds. Get clean
              totals.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
              Failed statuses are dropped. Refunds that match a payment or
              subscription of the same amount cancel both sides out.
            </p>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <FileDropzone onFile={handleFile} loading={loading} error={error} />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 backdrop-blur">
                  Loaded{" "}
                  <span className="font-semibold text-foreground">{fileName}</span>
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Upload another
                </button>
              </div>

              <StatsBento stats={result.stats} currency={currency} />
              <ResultsChart rows={result.rows} />
              <ResultsTable rows={result.rows} stats={result.stats} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
