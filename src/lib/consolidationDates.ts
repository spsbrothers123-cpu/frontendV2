import type { ConsolidationRangeKey } from "../types/consolidation";

// Local-calendar YYYY-MM-DD (never toISOString(), which shifts the day for
// anyone east/west of UTC).
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export interface ResolvedRange {
  dateFrom: string;
  dateTo: string;
}

/**
 * Resolves a preset to concrete dates. Returns null for an incomplete or
 * inverted custom range, so the caller never fires a request with bad dates.
 */
export function resolveRange(
  range: ConsolidationRangeKey,
  customFrom: string,
  customTo: string
): ResolvedRange | null {
  switch (range) {
    case "today":
      return { dateFrom: toYmd(daysAgo(0)), dateTo: toYmd(daysAgo(0)) };
    case "yesterday":
      return { dateFrom: toYmd(daysAgo(1)), dateTo: toYmd(daysAgo(1)) };
    case "last7":
      return { dateFrom: toYmd(daysAgo(6)), dateTo: toYmd(daysAgo(0)) };
    case "last30":
      return { dateFrom: toYmd(daysAgo(29)), dateTo: toYmd(daysAgo(0)) };
    case "custom":
      if (!customFrom || !customTo || customFrom > customTo) return null;
      return { dateFrom: customFrom, dateTo: customTo };
  }
}
