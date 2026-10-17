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

/** Format payment Created At for display next to Paid (short month). */
export function formatPaidAt(value: unknown) {
  if (value == null || value === "") return "";
  const d = new Date(value as string | number | Date);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const raw = String(value).trim();
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

export const COMPARE_EXPORT_HEADERS = [
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

export function compareResultToCsv(rows: MemberRow[]) {
  const escape = (value: unknown) => {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    COMPARE_EXPORT_HEADERS.join(","),
    ...rows.map((row) =>
      COMPARE_EXPORT_HEADERS.map((h) => escape(row[h])).join(",")
    ),
  ];
  return lines.join("\n");
}

/** Styled .xlsx: Paid = green bg / white Arial; Past Due = bold red Arial. */
export async function compareResultToXlsx(rows: MemberRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Membership status", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COMPARE_EXPORT_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(12, header.length + 2),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { name: "Arial", bold: true, size: 11 };
  headerRow.alignment = { vertical: "middle" };

  const payStatusCol = COMPARE_EXPORT_HEADERS.indexOf("Pay Status") + 1;

  rows.forEach((row, index) => {
    const values = COMPARE_EXPORT_HEADERS.map((h) => row[h] ?? "");
    const excelRow = sheet.addRow(values);
    excelRow.font = { name: "Arial", size: 11 };

    const statusCell = excelRow.getCell(payStatusCol);
    statusCell.alignment = { vertical: "middle", horizontal: "left" };

    if (row["Pay Status"] === "Paid") {
      statusCell.value = "Paid";
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00B050" },
      };
      statusCell.font = {
        name: "Arial",
        color: { argb: "FFFFFFFF" },
        size: 11,
      };
    } else {
      statusCell.value = "Past Due";
      statusCell.font = {
        name: "Arial",
        color: { argb: "FFFF0000" },
        bold: true,
        size: 11,
      };
    }

    // Slightly wider status column after first data row
    if (index === 0) {
      sheet.getColumn(payStatusCol).width = 14;
      sheet.getColumn(COMPARE_EXPORT_HEADERS.indexOf("Customer Email") + 1).width =
        32;
      sheet.getColumn(COMPARE_EXPORT_HEADERS.indexOf("Customer Name") + 1).width =
        22;
      sheet.getColumn(COMPARE_EXPORT_HEADERS.indexOf("Offer Title") + 1).width = 28;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
