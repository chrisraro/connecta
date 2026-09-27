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

/** e.g. "connecta-ph-leads-2026-09-27.csv": the product name as a slug. */
export function leadsExportFilename(brandName: string, isoDate: string): string {
  const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug}-leads-${isoDate}.csv`;
}
