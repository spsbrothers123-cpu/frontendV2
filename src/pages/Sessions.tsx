import { useCallback, useEffect, useState } from "react";
import { Users, CircleDollarSign } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { DataTable, ErrorState, EmptyState, FilterBar, Select, Pagination, StatusBadge, CardSkeleton } from "../components/ui";
import { formatCurrency } from "../components/ui/MiniChart";
import type { Column } from "../components/ui/DataTable";
import { SessionDetailsDrawer } from "../components/sessions/SessionDetailsDrawer";
import * as sessionsApi from "../api/sessions";
import { fetchCashiers } from "../api/cashiers";
import type { ActiveSession, SessionHistoryItem, SessionDetails, CashierAccount } from "../types";

const PAGE_SIZE = 8;

export default function Sessions() {
  return (
    <div>
      <PageHeader title="Sessions" subtitle="Cashier register sessions — active and historical." />
      <ActiveSessionSection />
      <div className="mt-8">
        <h2 className="font-display font-bold text-lg text-charcoal mb-4">Session History</h2>
        <SessionHistorySection />
      </div>
    </div>
  );
}

function ActiveSessionSection() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setSessions(await sessionsApi.fetchActiveSessions());
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  if (state === "error") return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load active sessions." onRetry={load} /></div>;
  if (sessions.length === 0) return <div className="rounded-card bg-white shadow-soft"><EmptyState icon={<Users size={22} />} title="No active sessions" description="No cashier is currently signed into a register." /></div>;

  return (
    <div className="space-y-4">
      {sessions.map((s) => (
        <div key={s.id} className="rounded-card bg-white shadow-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal">{s.cashier}</h3>
              <p className="text-sm text-charcoal-muted">{s.shop} · opened {new Date(s.openingTime).toLocaleString("en-IN")}</p>
            </div>
            <StatusBadge status={s.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <Kpi label="Opening Cash" value={formatCurrency(s.openingCash)} />
            <Kpi label="Sales" value={formatCurrency(s.sales)} strong />
            <Kpi label="Cash Sales" value={formatCurrency(s.cashSales)} />
            <Kpi label="UPI" value={formatCurrency(s.upiSales)} />
            <Kpi label="Card" value={formatCurrency(s.cardSales)} />
            <Kpi label="Credit" value={formatCurrency(s.creditSales)} />
          </div>
          <div className="mt-4 pt-4 border-t border-charcoal/8 flex flex-wrap items-center gap-6">
            <Kpi label="Expected Closing Cash" value={formatCurrency(s.expectedClosingCash)} />
            <Kpi label="Actual Closing Cash" value={s.actualClosingCash != null ? formatCurrency(s.actualClosingCash) : "Not closed yet"} />
            <Kpi label="Cash Difference" value={s.cashDifference != null ? formatCurrency(s.cashDifference) : "—"} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-charcoal-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={strong ? "font-display font-bold text-lg text-charcoal" : "font-semibold text-charcoal"}>{value}</p>
    </div>
  );
}

function SessionHistorySection() {
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cashier, setCashier] = useState("all");
  const [status, setStatus] = useState("all");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [viewing, setViewing] = useState<SessionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);

  useEffect(() => {
    // Real active cashiers for this shop, not the session-history mock —
    // covers cashiers who haven't opened a session yet too.
    fetchCashiers()
      .then(setCashiers)
      .catch(() => setCashiers([]));
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await sessionsApi.fetchSessionHistory({ cashier, status, page, pageSize: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      setState("error");
    }
  }, [cashier, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [cashier, status]);

  async function openDetails(item: SessionHistoryItem) {
    setDetailsLoading(true);
    try {
      setViewing(await sessionsApi.fetchSessionDetails(item.id));
    } finally {
      setDetailsLoading(false);
    }
  }

  const columns: Column<SessionHistoryItem>[] = [
    { key: "cashier", header: "Cashier", isPrimary: true, render: (s) => <span className="font-medium text-charcoal">{s.cashier}</span> },
    { key: "openingTime", header: "Opening Time", render: (s) => <span className="text-charcoal-muted">{new Date(s.openingTime).toLocaleString("en-IN")}</span> },
    { key: "closingTime", header: "Closing Time", render: (s) => <span className="text-charcoal-muted">{new Date(s.closingTime).toLocaleString("en-IN")}</span> },
    { key: "openingCash", header: "Opening Cash", render: (s) => <span>{formatCurrency(s.openingCash)}</span> },
    { key: "closingCash", header: "Closing Cash", render: (s) => <span>{formatCurrency(s.closingCash)}</span> },
    { key: "sales", header: "Sales", render: (s) => <span className="font-semibold">{formatCurrency(s.sales)}</span> },
    { key: "cashDifference", header: "Cash Difference", render: (s) => <span className={s.cashDifference === 0 ? "text-olive" : "text-danger font-semibold"}>{s.cashDifference > 0 ? "+" : ""}{formatCurrency(s.cashDifference)}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <FilterBar>
        <Select value={cashier} onChange={(e) => setCashier(e.target.value)} className="w-auto min-w-[150px]"
          options={[{ label: "All cashiers", value: "all" }, ...cashiers.map((c) => ({ label: c.name, value: c.name }))]} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[150px]"
          options={[
            { label: "All statuses", value: "all" },
            { label: "Closed", value: "Closed" },
            { label: "Discrepancy", value: "Discrepancy" },
          ]} />
      </FilterBar>

      <div className="mt-4">
        {state === "error" && <ErrorState message="Couldn't load session history." onRetry={load} />}
        {state === "success" && items.length === 0 && <EmptyState icon={<CircleDollarSign size={22} />} title="No sessions found" description="Try adjusting your filters." />}
        {(state === "loading" || items.length > 0) && (
          <DataTable columns={columns} rows={items} rowKey={(s) => s.id} isLoading={state === "loading"} onRowClick={openDetails} />
        )}
      </div>

      {state === "success" && items.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      )}

      <SessionDetailsDrawer session={viewing} isLoading={detailsLoading} onClose={() => setViewing(null)} />
    </div>
  );
}
