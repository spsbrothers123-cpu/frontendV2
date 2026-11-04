import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Stale-response guard. `begin()` returns a ticket; `isCurrent(ticket)` is true
 * only for the most recent ticket and only while mounted. A slow response for
 * an older filter/page/branch can therefore never overwrite a newer one.
 */
export function useRequestGuard() {
  const latest = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const begin = useCallback(() => ++latest.current, []);
  const isCurrent = useCallback((ticket: number) => mounted.current && ticket === latest.current, []);
  // Memoised so callers can list the guard in effect/callback dependencies.
  return useMemo(() => ({ begin, isCurrent }), [begin, isCurrent]);
}
