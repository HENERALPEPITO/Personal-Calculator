import * as XLSX from "xlsx";

/** Read first sheet as row objects, auto-detecting a header row that looks like payment/member data. */
export async function parseSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");
  const sheet = workbook.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) throw new Error("The file has no data.");

  const headerIndex = findHeaderRow(matrix);
  const headers = (matrix[headerIndex] ?? []).map((h, i) => {
    const label = String(h ?? "").trim();
    return label || `__col_${i}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    headers.forEach((header, i) => {
      const value = line[i] ?? "";
      obj[header] = value;
      if (String(value).trim() !== "") hasValue = true;
    });
    if (hasValue) rows.push(obj);
  }

  return rows;
}

function findHeaderRow(matrix: (string | number | Date | null)[][]): number {
  const mustHave = ["customer email", "email"];
  const helpful = ["amount", "customer id", "customer name", "type", "status"];

  let best = { index: 0, score: -1 };
  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const cells = (matrix[i] ?? []).map((c) =>
      String(c ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
    );
    if (!cells.some(Boolean)) continue;

    const hasEmail = mustHave.some((m) =>
      cells.some((c) => c === m || c.includes(m))
    );
    if (!hasEmail) continue;

    const score =
      10 +
      helpful.reduce(
        (sum, h) => sum + (cells.some((c) => c === h || c.includes(h)) ? 1 : 0),
        0
      );
    if (score > best.score) best = { index: i, score };
  }

  if (best.score < 0) {
    // Fallback: first non-empty row
    for (let i = 0; i < matrix.length; i++) {
      if ((matrix[i] ?? []).some((c) => String(c ?? "").trim())) return i;
    }
  }
  return best.index;
}
