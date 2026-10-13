// Formatting helpers shared by the generator and the app. Ported unchanged
// from the prototype so labels, dates and ranges render identically.

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const money = (n: number | null | undefined): string =>
  n == null ? '—' : n >= 1000 ? `$${(n / 1000).toFixed(1)}B` : `$${n}M`;

export const range = (a: [number, number] | null | undefined): string =>
  !a ? 'Not disclosed' : `${money(a[0])} – ${money(a[1])}`;

export const cap1 = (s: string): string => s[0].toUpperCase() + s.slice(1);

export function csv(rows: unknown[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? '' : String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        })
        .join(','),
    )
    .join('\n');
}

export function download(name: string, text: string, type = 'text/csv'): void {
  const b = new Blob([text], { type });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
