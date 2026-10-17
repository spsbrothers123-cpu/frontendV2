import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, MutableRefObject } from "react";
import type { ConsolidationQuery, ConsolidationShop } from "../../types/consolidation";

// Everything in here is LOCAL to the Consolidation page. Nothing reads or
// writes the global ShopContext, localStorage or sessionStorage.

const SHOP_COLORS = ["#F0B429", "#5C6B2C", "#C15B4A", "#2F6F8F", "#8A5E14", "#7B5EA7", "#C87F0A", "#6B6459"];

interface ConsolidationContextValue {
  query: ConsolidationQuery;
  shops: ConsolidationShop[];
  cache: MutableRefObject<Map<string, unknown>>;
  refreshKey: number;
  shopColor: (shopId: string) => string;
  shopName: (shopId: string, fallback?: string) => string;
}

const Ctx = createContext<ConsolidationContextValue | undefined>(undefined);

export function ConsolidationProvider({
  query,
  shops,
  cache,
  refreshKey,
  children,
}: {
  query: ConsolidationQuery;
  shops: ConsolidationShop[];
  /** Owned by the page, which clears it in the Refresh handler before bumping refreshKey. */
  cache: MutableRefObject<Map<string, unknown>>;
  refreshKey: number;
  children: ReactNode;
}) {

  const value = useMemo<ConsolidationContextValue>(() => {
    const index = new Map(shops.map((s, i) => [s.id, i]));
    return {
      query,
      shops,
      cache,
      refreshKey,
      shopColor: (id) => SHOP_COLORS[(index.get(id) ?? shops.length) % SHOP_COLORS.length],
      shopName: (id, fallback) => shops.find((s) => s.id === id)?.name ?? fallback ?? id,
    };
  }, [query, shops, cache, refreshKey]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsolidation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsolidation must be used within ConsolidationProvider");
  return ctx;
}

// ── Data hook ──────────────────────────────────────────
export type SectionState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export function dateScopeKey(q: ConsolidationQuery) {
  return `${q.shop}|${q.dateFrom}|${q.dateTo}`;
}

/**
 * Fetches one section. Results are cached for the lifetime of the page, keyed
 * by `cacheKey`, so switching tabs back and forth never refetches. In-flight
 * requests are aborted when the key changes, and a failed request NEVER falls
 * back to placeholder data — it surfaces an error state instead.
 */
export function useSectionData<T>(
  cacheKey: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  endpointLabel: string
) {
  const { cache, refreshKey } = useConsolidation();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // State is tagged with the key it belongs to, so data fetched for another
  // shop / date range is never shown for even one frame after a key change.
  const [held, setHeld] = useState<{ key: string; state: SectionState<T> } | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const cached = cache.current.get(cacheKey) as T | undefined;
    if (cached !== undefined) {
      setHeld({ key: cacheKey, state: { status: "success", data: cached } });
      return;
    }

    const controller = new AbortController();
    setHeld({ key: cacheKey, state: { status: "loading" } });

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        cache.current.set(cacheKey, data);
        setHeld({ key: cacheKey, state: { status: "success", data } });
      })
      .catch((err: { status?: number | null; message?: string }) => {
        if (controller.signal.aborted) return;
        const message =
          err?.status === 404
            ? `The server doesn't have this Consolidation endpoint yet (${endpointLabel}). The backend needs to provide it.`
            : err?.message || "Couldn't load this section.";
        setHeld({ key: cacheKey, state: { status: "error", message } });
      });

    return () => controller.abort();
  }, [cacheKey, refreshKey, retryTick, cache, endpointLabel]);

  const state: SectionState<T> = held && held.key === cacheKey ? held.state : { status: "loading" };
  return { state, retry: () => setRetryTick((n) => n + 1) };
}
