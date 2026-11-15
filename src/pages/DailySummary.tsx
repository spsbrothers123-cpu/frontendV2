import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { CardSkeleton, ErrorState, EmptyState, Skeleton } from "../components/ui";
import { formatCurrency } from "../components/ui/MiniChart";
import * as notificationsApi from "../api/notifications";
import { NOTIFICATION_CENTER_PATH, NOTIFICATION_TIME_ZONE, errorMessage, formatFullTime } from "../lib/notifications";
import type { DailySummary as DailySummaryData, SummaryMetric } from "../types/notifications";

// Approved rule: the summary covers 12 AM–10 PM IST and is generated at 10 PM IST.
const APPROVED_WINDOW = "12:00 AM – 10:00 PM IST";

function formatMetric(m: SummaryMetric): string {
  if (typeof m.value === "string") return m.value;
  if (m.format === "currency") return formatCurrency(m.value);
  if (m.format === "percent") return `${m.value}%`;
  return m.value.toLocaleString("en-IN");
}

function formatBusinessDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-IN", { timeZone: NOTIFICATION_TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

function windowLabel(s: DailySummaryData): string {
  if (!s.windowStart || !s.windowEnd) return APPROVED_WINDOW;
  return `${formatFullTime(s.windowStart)} – ${formatFullTime(s.windowEnd)}`;
}

export default function DailySummary() {
  const { summaryId = "" } = useParams();
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setSummary(await notificationsApi.fetchDailySummary(summaryId));
      setState("success");
    } catch (err) {
      setError(errorMessage(err, "Couldn't load this summary."));
      setState("error");
    }
  }, [summaryId]);

  // Viewing a summary never marks its notification read — that stays manual.
  useEffect(() => { void load(); }, [load]);

  const back = (
    <Link to={NOTIFICATION_CENTER_PATH} className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-muted hover:text-charcoal mb-4">
      <ArrowLeft size={15} /> Back to notifications
    </Link>
  );

  if (state === "loading") {
    return (
      <div>
        {back}
        <div role="status" aria-label="Loading summary">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
        </div>
      </div>
    );
  }

  if (state === "error" || !summary) {
    return <div>{back}<div className="rounded-card bg-white shadow-soft"><ErrorState message={error} onRetry={() => void load()} /></div></div>;
  }

  // Column set for the branch table: every metric any branch reports.
  const columns: { key: string; label: string }[] = [];
  summary.branches.forEach((b) => b.metrics.forEach((m) => { if (!columns.some((c) => c.key === m.key)) columns.push({ key: m.key, label: m.label }); }));

  return (
    <div>
      {back}
      <PageHeader title="Daily Business Summary" subtitle={formatBusinessDate(summary.businessDate)} />

      <div className="flex items-start gap-2.5 rounded-btn bg-yolk-50 border border-yolk-200 px-4 py-3 mb-6 text-sm text-charcoal">
        <Clock size={16} className="text-yolk-700 mt-0.5 shrink-0" />
        <p>
          <span className="font-medium">Reporting window:</span> {windowLabel(summary)}
          {summary.generatedAt && <> · <span className="font-medium">Generated:</span> {formatFullTime(summary.generatedAt)}</>}
        </p>
      </div>

      {summary.metrics.length === 0 && summary.branches.length === 0 ? (
        <div className="rounded-card bg-white shadow-soft"><EmptyState title="This summary has no figures" description="The backend returned the summary without any metrics." /></div>
      ) : (
        <>
          {summary.metrics.length > 0 && (
            <section aria-label="All branches" className="mb-8">
              <h2 className="font-display font-bold text-lg text-charcoal mb-3">All branches</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {summary.metrics.map((m) => (
                  <div key={m.key} className="rounded-card bg-white p-5 shadow-soft">
                    <dt className="text-sm text-charcoal-muted">{m.label}</dt>
                    <dd className="font-display font-extrabold text-2xl text-charcoal mt-1">{formatMetric(m)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {summary.branches.length > 0 && (
            <section aria-label="By branch">
              <h2 className="font-display font-bold text-lg text-charcoal mb-3">By branch</h2>
              <div className="rounded-card bg-white shadow-soft overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-charcoal/8 text-left text-charcoal-muted">
                      <th scope="col" className="px-4 py-3 font-medium">Branch</th>
                      {columns.map((c) => <th key={c.key} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.branches.map((b) => (
                      <tr key={b.branch.id} className="border-b border-charcoal/6 last:border-0">
                        <th scope="row" className="px-4 py-3 text-left font-medium text-charcoal whitespace-nowrap">{b.branch.name}</th>
                        {columns.map((c) => {
                          const m = b.metrics.find((x) => x.key === c.key);
                          return <td key={c.key} className="px-4 py-3 text-charcoal whitespace-nowrap">{m ? formatMetric(m) : "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
