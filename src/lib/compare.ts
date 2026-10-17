import type { OrderRow } from "@/lib/process";
import { parseAmount } from "@/lib/process";

export type MemberPayStatus = "Paid" | "Past Due";

export type MemberRow = {
  ID: string;
  Amount: string | number;
  Currency: string;
  Type: string;
  "Customer ID": string;
  "Customer Email": string;
  "Offer Title": string;
  Provider: string;
  "Created At": string;
  "Customer Name": string;
  "Previous Note": string;
  "Pay Status": MemberPayStatus;
  "Paid At": string;
  "Matched Payment ID": string;
};

export type CompareStats = {
  membersTotal: number;
  paid: number;
  pastDue: number;
  paidAmount: number;
  pastDueAmount: number;
};

export type CompareResult = {
  rows: MemberRow[];
  stats: CompareStats;
};

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

export function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeId(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Handle Excel scientific notation like 2.30E+09
  if (/e\+/i.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return String(Math.round(n));
  }
  if (/^\d+\.0+$/.test(raw)) return raw.replace(/\.0+$/, "");
  return raw;
}

function looksLikeEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

function getCell(row: Record<string, unknown>, col: string | null) {
  if (!col) return "";
  return row[col] ?? "";
}

function paymentTime(row: OrderRow) {
  const d = new Date(row["Created At"] as string | number | Date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function preferNewer(current: OrderRow | undefined, next: OrderRow) {
  if (!current) return next;
  return paymentTime(next) >= paymentTime(current) ? next : current;
}

/** Format payment Created At for display next to Paid. */
export function formatPaidAt(value: unknown) {
  if (value == null || value === "") return "";
  const d = new Date(value as string | number | Date);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const raw = String(value).trim();
  // Keep short date-like strings as-is (e.g. 8/2/2026 21:52 → 8/2/2026)
  const dateOnly = raw.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return dateOnly?.[1] ?? raw;
}

/** Build lookup of who already paid from cleaned payment source rows. */
export function buildPaidIndex(payments: OrderRow[]) {
  const byEmail = new Map<string, OrderRow>();
  const byCustomerId = new Map<string, OrderRow>();

  for (const row of payments) {
    const email = normalizeEmail(row["Customer Email"]);
    const customerId = normalizeId(row["Customer ID"]);
    if (email && looksLikeEmail(email)) {
      byEmail.set(email, preferNewer(byEmail.get(email), row));
    }
    if (customerId) {
      byCustomerId.set(customerId, preferNewer(byCustomerId.get(customerId), row));
    }
  }

  return { byEmail, byCustomerId };
}

function pickPreviousNote(
  row: Record<string, unknown>,
  headers: string[],
  knownCols: Set<string>
) {
  // Prefer an explicit status/note column; otherwise last unused text column.
  const statusCol = findColumn(headers, [
    "Status",
    "Note",
    "Notes",
    "Membership Status",
    "Pay Status",
    "Current Status",
  ]);
  if (statusCol && !knownCols.has(statusCol)) {
    return String(row[statusCol] ?? "").trim();
  }

  for (let i = headers.length - 1; i >= 0; i--) {
    const h = headers[i];
    if (!h || knownCols.has(h) || h.startsWith("__col_")) continue;
    const val = String(row[h] ?? "").trim();
    if (!val) continue;
    if (looksLikeEmail(val)) continue;
    if (/^\d+(\.\d+)?$/.test(val)) continue;
    return val;
  }
  return "";
}

export function parseMemberRows(
  rawRows: Record<string, unknown>[]
): Omit<MemberRow, "Pay Status" | "Paid At" | "Matched Payment ID">[] {
  if (!rawRows.length) throw new Error("Members file has no data rows.");

  const headers = Object.keys(rawRows[0]);
  const emailCol = findColumn(headers, ["Customer Email", "Email"]);
  if (!emailCol) {
    throw new Error(
      "Members file needs a Customer Email column (monthly members roster)."
    );
  }

  const idCol = findColumn(headers, ["ID"]);
  const amountCol = findColumn(headers, ["Amount"]);
  const currencyCol = findColumn(headers, ["Currency"]);
  const typeCol = findColumn(headers, ["Type"]);
  const customerIdCol = findColumn(headers, ["Customer ID"]);
  const offerCol = findColumn(headers, ["Offer Title", "Offer"]);
  const providerCol = findColumn(headers, ["Provider"]);
  const createdCol = findColumn(headers, ["Created At", "Created"]);
  const nameCol = findColumn(headers, ["Customer Name", "Name"]);

  const known = new Set(
    [
      emailCol,
      idCol,
      amountCol,
      currencyCol,
      typeCol,
      customerIdCol,
      offerCol,
      providerCol,
      createdCol,
      nameCol,
    ].filter(Boolean) as string[]
  );

  const members: Omit<
    MemberRow,
    "Pay Status" | "Paid At" | "Matched Payment ID"
  >[] = [];

  for (const row of rawRows) {
    const email = normalizeEmail(getCell(row, emailCol));
    if (!looksLikeEmail(email)) continue;

    // Skip title/banner rows that somehow include an email-like string
    const name = String(getCell(row, nameCol)).trim();
    if (/monthly members/i.test(name)) continue;

    members.push({
      ID: String(getCell(row, idCol)).trim(),
      Amount: getCell(row, amountCol) as string | number,
      Currency: String(getCell(row, currencyCol)).trim() || "USD",
      Type: String(getCell(row, typeCol)).trim(),
      "Customer ID": normalizeId(getCell(row, customerIdCol)),
      "Customer Email": email,
      "Offer Title": String(getCell(row, offerCol)).trim(),
      Provider: String(getCell(row, providerCol)).trim(),
      "Created At": String(getCell(row, createdCol)).trim(),
      "Customer Name": name,
      "Previous Note": pickPreviousNote(row, headers, known),
    });
  }

  if (!members.length) {
    throw new Error("No member rows with valid Customer Email found.");
  }

  return members;
}

export function compareMembersToPayments(
  memberRawRows: Record<string, unknown>[],
  payments: OrderRow[]
): CompareResult {
  const members = parseMemberRows(memberRawRows);
  const paidIndex = buildPaidIndex(payments);

  const rows: MemberRow[] = members.map((member) => {
    const byEmail = paidIndex.byEmail.get(normalizeEmail(member["Customer Email"]));
    const byId =
      member["Customer ID"]
        ? paidIndex.byCustomerId.get(normalizeId(member["Customer ID"]))
        : undefined;
    const match = byEmail || byId;

    return {
      ...member,
      "Pay Status": match ? "Paid" : "Past Due",
      "Paid At": match ? formatPaidAt(match["Created At"]) : "",
      "Matched Payment ID": match ? String(match.ID ?? "") : "",
    };
  });

  const paidRows = rows.filter((r) => r["Pay Status"] === "Paid");
  const pastDueRows = rows.filter((r) => r["Pay Status"] === "Past Due");

  const sumAmount = (list: MemberRow[]) =>
    list.reduce((sum, row) => {
      const n = parseAmount(row.Amount);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

  return {
    rows,
    stats: {
      membersTotal: rows.length,
      paid: paidRows.length,
      pastDue: pastDueRows.length,
      paidAmount: sumAmount(paidRows),
      pastDueAmount: sumAmount(pastDueRows),
    },
  };
}

export function compareResultToCsv(rows: MemberRow[]) {
  const headers = [
    "ID",
    "Amount",
    "Currency",
    "Type",
    "Customer ID",
    "Customer Email",
    "Offer Title",
    "Provider",
    "Created At",
    "Customer Name",
    "Previous Note",
    "Pay Status",
    "Paid At",
    "Matched Payment ID",
  ] as const;

  const escape = (value: unknown) => {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}
