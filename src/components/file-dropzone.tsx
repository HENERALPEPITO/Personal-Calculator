import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  onFile: (file: File) => void;
  loading?: boolean;
  error?: string | null;
};

export function FileDropzone({ onFile, loading, error }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div className="space-y-3">
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        disabled={loading}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-dashed p-10 text-left transition",
          dragging
            ? "border-accent bg-accent-soft/40"
            : "border-slate-300 bg-white hover:border-accent/60 hover:bg-slate-50/80",
          loading && "pointer-events-none opacity-70"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-1/2 top-0 h-full w-full opacity-0 transition group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(15,118,110,0.08) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.8s linear infinite",
          }}
        />

        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-teal-900/20">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {loading ? "Processing your export…" : "Drop CSV or XLSX here"}
            </p>
            <p className="text-sm text-muted">
              or click to browse · needs Amount, Type, Status columns
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                <FileSpreadsheet className="h-3.5 w-3.5 text-accent" />
                .csv
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                <FileSpreadsheet className="h-3.5 w-3.5 text-accent" />
                .xlsx
              </span>
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </motion.button>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
