// Characters that make Excel, Sheets and LibreOffice read a cell as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One quoted CSV cell. Values that would run as a spreadsheet formula get an
 * apostrophe prefix, which spreadsheets hide and treat as "this is text".
 */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
