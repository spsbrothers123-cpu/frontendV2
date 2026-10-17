import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { Button } from "../ui";
import { exportConsolidation } from "../../api/consolidationApi";
import { useToast } from "../../context/ToastContext";
import type {
  ConsolidationExportFormat,
  ConsolidationExportScope,
  ConsolidationQuery,
  ConsolidationSection,
} from "../../types/consolidation";

// Two separate export paths, both handled by the backend so the file always
// reflects the complete filtered dataset (never just the visible rows):
//   • Export Selected Section — the tab currently open
//   • Export Complete Report  — every section together
export function ExportMenu({
  section,
  sectionLabel,
  query,
  canExportSection,
  canExportFull,
}: {
  section: ConsolidationSection;
  sectionLabel: string;
  query: ConsolidationQuery;
  canExportSection: boolean;
  canExportFull: boolean;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function run(scope: ConsolidationExportScope, format: ConsolidationExportFormat) {
    setOpen(false);
    setPending(`${scope}-${format}`);
    try {
      await exportConsolidation(scope, section, format, query);
      showToast("Export downloaded.", "success");
    } catch (err) {
      showToast((err as { message?: string })?.message || "Export failed. Please try again.", "error");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  const item = (scope: ConsolidationExportScope, format: ConsolidationExportFormat, enabled: boolean) => (
    <button
      key={`${scope}-${format}`}
      role="menuitem"
      disabled={!enabled || busy}
      onClick={() => run(scope, format)}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-charcoal hover:bg-ivory-soft disabled:opacity-40 disabled:hover:bg-transparent transition-colors duration-150 text-left"
    >
      {format === "excel" ? <FileSpreadsheet size={15} /> : <FileText size={15} />}
      {format === "excel" ? "Excel (.xlsx)" : "PDF"}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" isLoading={busy} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {!busy && <Download size={15} />}
        {busy ? "Preparing file…" : "Export"}
        {!busy && <ChevronDown size={14} />}
      </Button>

      {open && (
        <div role="menu" aria-label="Export options"
          className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-card shadow-lift border border-charcoal/6 py-1.5 z-40">
          <p className="px-3.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">Export Selected Section</p>
          <p className="px-3.5 pb-1 text-xs text-charcoal-muted truncate">{sectionLabel}</p>
          {item("section", "excel", canExportSection)}
          {item("section", "pdf", canExportSection)}
          <div className="my-1.5 border-t border-charcoal/6" />
          <p className="px-3.5 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">Export Complete Report</p>
          {item("full", "excel", canExportFull)}
          {item("full", "pdf", canExportFull)}
          {(!canExportSection || !canExportFull) && (
            <p className="px-3.5 pt-2 pb-1 text-xs text-danger">Choose a valid date range to export.</p>
          )}
        </div>
      )}
    </div>
  );
}
