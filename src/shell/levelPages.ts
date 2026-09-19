/** Level-select paging, kept free of the DOM so it can be tested. */

export const PAGE_SIZE = 20;

export interface Page {
  /** 0-based index of the first level on the page. */
  start: number;
  /** One past the last level on the page. */
  end: number;
  /** Shown to the player, 1-based: "21–40". */
  label: string;
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

export function pages(total: number, size = PAGE_SIZE): Page[] {
  const out: Page[] = [];
  for (let p = 0; p < pageCount(total, size); p++) {
    const start = p * size;
    const end = Math.min(Math.max(0, total), start + size);
    const label = end - start <= 1 ? `${start + 1}` : `${start + 1}–${end}`;
    out.push({ start, end, label });
  }
  return out;
}

/** The page holding `level`, clamped so a stale saved index still opens a real page. */
export function pageOf(level: number, total: number, size = PAGE_SIZE): number {
  const last = pageCount(total, size) - 1;
  if (!Number.isFinite(level) || level < 0) return 0;
  return Math.min(last, Math.floor(level / size));
}

/** Page after `delta` steps, stopping at the ends. */
export function stepPage(page: number, delta: number, total: number, size = PAGE_SIZE): number {
  return Math.min(pageCount(total, size) - 1, Math.max(0, page + delta));
}
