import { useEffect, useState } from "react";

/** Re-renders the caller every `intervalMs` and returns the current time (ms). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "12:05" style countdown; null once the deadline has passed. */
export function formatRemaining(expiresAtIso: string, now: number): string | null {
  const ms = new Date(expiresAtIso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN");
}
