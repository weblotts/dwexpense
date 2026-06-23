/** Active currency code — updated by AuthContext on login/restore. */
let _currency = localStorage.getItem('currency') ?? 'USD';

export function setCurrency(code: string) {
  _currency = code;
  localStorage.setItem('currency', code);
}

export function getCurrency(): string { return _currency; }

export const money = (n: number): string =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: _currency }).format(n || 0);

/** Parse an ISO date string as LOCAL midnight to avoid the UTC-shift off-by-one day bug. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const dayLabel = (iso: string): string =>
  parseLocalDate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/** Current month as YYYY-MM. */
export const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Today as YYYY-MM-DD for date inputs. */
export const todayInput = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
