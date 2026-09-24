export type OrderRow = {
  ID: string | number;
  Amount: string | number;
  Currency: string;
  Type: string;
  "Payment Method": string;
  "Customer ID": string | number;
  "Customer Name": string;
  "Customer Email": string;
  "Offer ID": string | number;
  "Offer Title": string;
  "Pricing Option": string;
  "Order No.": string | number;
  Provider: string;
  "Created At": string | number | Date;
  Status: string;
};

export type ProcessStats = {
  initialCount: number;
  failedRemoved: number;
  refundPairsRemoved: number;
  finalCount: number;
  totalAmount: number;
};

export type ProcessResult = {
  rows: OrderRow[];
  stats: ProcessStats;
};

export const KEEP_COLUMNS = [
  "ID",
  "Amount",
  "Currency",
  "Type",
  "Payment Method",
  "Customer ID",
  "Customer Name",
  "Customer Email",
  "Offer ID",
  "Offer Title",
  "Pricing Option",
  "Order No.",
  "Provider",
  "Created At",
  "Status",
] as const;

export const DISPLAY_COLUMNS = [
  "Order No.",
  "Customer Name",
  "Type",
  "Amount",
  "Currency",
  "Status",
  "Created At",
  "Offer Title",
] as const;

function normalizeHeader(h: unknown) {
  return String(h ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function findColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map((h) => ({
    raw: h,
    key: normalizeHeader(h).toLowerCase(),
  }));
  for (const candidate of candidates) {
    const want = candidate.toLowerCase();
    const hit = normalized.find((h) => h.key === want);
    if (hit) return hit.raw;
  }
  for (const candidate of candidates) {
    const want = candidate.toLowerCase();
    const hit = normalized.find(
      (h) => h.key.includes(want) || want.includes(h.key)
    );
    if (hit) return hit.raw;
  }
  return null;
}

export function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return NaN;
  const cleaned = String(value)
    .replace(/[^0-9.\-]/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function amountKey(n: number) {
  return Math.round(Math.abs(n) * 100);
}

function isFailedStatus(status: unknown) {
  return String(status ?? "").trim().toLowerCase() === "failed";
}

function isRefundType(type: unknown) {
  return String(type ?? "").trim().toLowerCase() === "refund";
}

function isPaymentLike(type: unknown) {
  const t = String(type ?? "").trim().toLowerCase();
  return (
    t === "payment" ||
    t === "subscription" ||
    t === "charge" ||
    t === "sale"
  );
}

function pickColumns(row: Record<string, unknown>, headers: string[]): OrderRow {
  const out: Record<string, unknown> = {};
  for (const col of KEEP_COLUMNS) {
    const actual = findColumn(headers, [col]);
    out[col] = actual ? row[actual] : "";
  }
  return out as OrderRow;
}

export function processRows(
  rawRows: Record<string, unknown>[]
): ProcessResult {
  if (!rawRows.length) {
    throw new Error("The file has no data rows.");
  }

  const headers = Object.keys(rawRows[0]);
  const amountCol = findColumn(headers, ["Amount"]);
  const typeCol = findColumn(headers, ["Type"]);
  const statusCol = findColumn(headers, ["Status"]);
  const orderCol = findColumn(headers, [
    "Order No.",
    "Order No",
    "Order Number",
    "Order ID",
  ]);
  const customerCol = findColumn(headers, ["Customer ID", "Customer Id"]);

  if (!amountCol || !typeCol || !statusCol) {
    throw new Error(
      "Missing required columns. Need at least Amount, Type, and Status."
    );
  }

  const picked = rawRows.map((row) => pickColumns(row, headers));
  const initialCount = picked.length;

  const sorted = [...picked].sort((a, b) =>
    String(a.Status).localeCompare(String(b.Status), undefined, {
      sensitivity: "base",
    })
  );

  const withoutFailed = sorted.filter((row) => !isFailedStatus(row.Status));
  const failedRemoved = initialCount - withoutFailed.length;

  type Working = OrderRow & {
    _idx: number;
    _amount: number;
    _used: boolean;
  };

  const working: Working[] = withoutFailed.map((row, idx) => ({
    ...row,
    _idx: idx,
    _amount: parseAmount(row.Amount),
    _used: false,
  }));

  let refundPairsRemoved = 0;

  for (const refund of working) {
    if (refund._used || !isRefundType(refund.Type)) continue;
    if (!Number.isFinite(refund._amount)) continue;

    const refundCents = amountKey(refund._amount);
    let best: { row: Working; score: number } | null = null;

    for (const candidate of working) {
      if (candidate._used || candidate._idx === refund._idx) continue;
      if (isRefundType(candidate.Type)) continue;
      if (!Number.isFinite(candidate._amount)) continue;
      if (amountKey(candidate._amount) !== refundCents) continue;

      const sameOrder =
        !!orderCol &&
        String(refund["Order No."] ?? "").trim() !== "" &&
        String(refund["Order No."]).trim() ===
          String(candidate["Order No."]).trim();

      const sameCustomer =
        !!customerCol &&
        String(refund["Customer ID"] ?? "").trim() !== "" &&
        String(refund["Customer ID"]).trim() ===
          String(candidate["Customer ID"]).trim();

      const score =
        (sameOrder ? 100 : 0) +
        (sameCustomer ? 40 : 0) +
        (isPaymentLike(candidate.Type) ? 20 : 0);

      if (!best || score > best.score) {
        best = { row: candidate, score };
      }
    }

    if (best) {
      refund._used = true;
      best.row._used = true;
      refundPairsRemoved += 2;
    }
  }

  const remaining = working
    .filter((row) => !row._used)
    .map(({ _idx, _amount, _used, ...rest }) => rest);

  const totalAmount = remaining.reduce((sum, row) => {
    const n = parseAmount(row.Amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return {
    rows: remaining,
    stats: {
      initialCount,
      failedRemoved,
      refundPairsRemoved,
      finalCount: remaining.length,
      totalAmount,
    },
  };
}

export function groupSum(
  rows: OrderRow[],
  keyFn: (row: OrderRow) => string
): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || "Unknown";
    const amount = parseAmount(row.Amount);
    map.set(key, (map.get(key) || 0) + (Number.isFinite(amount) ? amount : 0));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function dateKey(value: unknown) {
  if (!value) return "Unknown";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) {
    const s = String(value).slice(0, 10);
    return s || "Unknown";
  }
  return d.toISOString().slice(0, 10);
}
