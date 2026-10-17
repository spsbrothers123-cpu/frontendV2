export const fmtNum = (n: number) => n.toLocaleString("en-IN");
export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

// Compact axis labels in the Indian numbering system (k / L / Cr).
export function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000000) return `${+(v / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${+(v / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return String(v);
}
