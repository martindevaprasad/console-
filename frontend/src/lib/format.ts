// Locale-aware formatting driven by the organization's currency/locale/timezone.

let ctx = { currency: 'USD', locale: 'en-US', timezone: undefined as string | undefined };
const cache = new Map<string, Intl.NumberFormat>();

export function configureFormat(currency?: string, locale?: string, timezone?: string) {
  ctx = { currency: currency || 'USD', locale: locale || 'en-US', timezone: timezone || undefined };
  cache.clear();
}

export function money(value: number | null | undefined, opts?: { compact?: boolean }) {
  const key = `${ctx.locale}|${ctx.currency}|${opts?.compact ? 1 : 0}`;
  let fmt = cache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(ctx.locale, {
        style: 'currency',
        currency: ctx.currency,
        ...(opts?.compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      });
    } catch {
      fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    }
    cache.set(key, fmt);
  }
  return fmt.format(value || 0);
}

export const num = (value: number | null | undefined, digits = 0) =>
  new Intl.NumberFormat(ctx.locale, { maximumFractionDigits: digits }).format(value || 0);

export const pct = (value: number | null | undefined, digits = 1) => `${(value || 0).toFixed(digits)}%`;

export function dateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(ctx.locale, { timeZone: ctx.timezone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function date(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(ctx.locale, { timeZone: ctx.timezone, year: 'numeric', month: 'short', day: 'numeric' });
}

export function time(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString(ctx.locale, { timeZone: ctx.timezone, hour: '2-digit', minute: '2-digit' });
}

export function minutesSince(value: string | Date) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}

export const label = (value?: string | null) =>
  (value || '').toLowerCase().split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

/** Local-time day range [start, end] for `offsetDays` ago (0 = today). */
export function dayRange(offsetDays = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - offsetDays);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function periodRange(period: 'today' | 'yesterday' | '7d' | '30d' | 'mtd' | '90d') {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === '30d') start.setDate(start.getDate() - 29);
  if (period === '90d') start.setDate(start.getDate() - 89);
  if (period === 'mtd') start.setDate(1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
