// Spreadsheet-safe CSV for exports built in the browser; mirrors backend App\Support\Csv.
// A cell that starts with = + - @ (or a tab or carriage return before one) would run as a
// formula when opened in Excel or Sheets, so it gets a leading apostrophe and shows as text.
const FORMULA_START = /^[=+\-@\t\r]/;

/** One quoted CSV cell. */
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** One CSV line. */
export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',');
}
