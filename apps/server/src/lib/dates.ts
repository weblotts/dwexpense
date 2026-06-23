/** Month helpers — all boundaries computed in the server's local timezone. */

/** Parse a "YYYY-MM" string; falls back to the current month when absent/invalid. */
export function monthRange(month?: string): { start: Date; end: Date } {
  const now = new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    year = y;
    monthIndex = m - 1;
  }

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0); // exclusive upper bound
  return { start, end };
}

/** Current month as "YYYY-MM". */
export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Number of days in a given month (defaults to current). */
export function daysInMonth(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
