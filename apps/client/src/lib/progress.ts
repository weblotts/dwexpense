/** Progress bar color by spend ratio: green <75%, amber 75-99%, red >=100%. */
export function progressColor(spent: number, limit: number): string {
  if (limit <= 0) return '#64748B';
  const ratio = spent / limit;
  if (ratio >= 1) return '#EF4444'; // red
  if (ratio >= 0.75) return '#F59E0B'; // amber
  return '#22C55E'; // green
}

export function progressPct(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (spent / limit) * 100);
}
