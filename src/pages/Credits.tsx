import { useCallback, useEffect, useState } from "react";
import { Wallet, CircleDollarSign, Clock3, CircleDollarSign as Collect } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard, CardSkeleton, ErrorState, EmptyState, SearchBar, FilterBar, DataTable, Pagination, Button } from "../components/ui";
import { formatCurrency } from "../components/ui/MiniChart";
import type { Column } from "../components/ui/DataTable";
import { CreditDetailsDrawer } from "../components/credits/CreditDetailsDrawer";
import { PaymentCollectionModal } from "../components/credits/PaymentCollectionModal";
import * as creditsApi from "../api/credits";
import type { CreditSummary, CustomerCredit } from "../types";
import { useToast } from "../context/ToastContext";

const PAGE_SIZE = 8;

export default function Credits() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "success" | "error">("loading");

  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const [viewing, setViewing] = useState<CustomerCredit | null>(null);
  const [collecting, setCollecting] = useState<CustomerCredit | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryState("loading");
    try {
      setSummary(await creditsApi.fetchCreditSummary());
      setSummaryState("success");
    } catch {
      setSummaryState("error");
    }
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await creditsApi.fetchCustomerCredits({ search, page, pageSize: PAGE_SIZE });
      setCredits(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, page]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  function handleCollected() {
    showToast("Payment recorded.");
    loadSummary();
    load();
  }

  const columns: Column<CustomerCredit>[] = [
    { key: "customer", header: "Customer", isPrimary: true, render: (c) => <span className="font-medium text-charcoal">{c.customerName}</span> },
    { key: "total", header: "Total Credit", render: (c) => <span>{formatCurrency(c.totalCredit)}</span> },
    { key: "paid", header: "Paid", render: (c) => <span className="text-olive">{formatCurrency(c.paid)}</span> },
    { key: "pending", header: "Pending", render: (c) => <span className="text-danger font-semibold">{formatCurrency(c.pending)}</span> },
    { key: "lastPayment", header: "Last Payment", render: (c) => <span className="text-charcoal-muted">{c.lastPayment ? new Date(c.lastPayment).toLocaleDateString("en-IN") : "—"}</span> },
  ];

  return (
    <div>
      <PageHeader title="Credits" subtitle="Track customer credit balances and collect outstanding payments." />

      {summaryState === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}
      {summaryState === "error" && (
        <div className="mb-6 rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load credit summary." onRetry={loadSummary} /></div>
      )}
      {summaryState === "success" && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon={<Wallet size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Credit" value={formatCurrency(summary.totalCredit)} trend={0} comparisonLabel="all-time issued" />
          <StatCard icon={<CircleDollarSign size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Collected" value={formatCurrency(summary.collected)} trend={0} comparisonLabel="settled to date" />
          <StatCard icon={<Clock3 size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Pending" value={formatCurrency(summary.pending)} trend={0} comparisonLabel="outstanding now" />
        </div>
      )}

      <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search customers on credit..." />
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load customer credits." onRetry={load} />}
          {state === "success" && credits.length === 0 && (
            <EmptyState icon={<Collect size={22} />} title="No outstanding credit" description="Customers with a credit balance will show up here." />
          )}
          {(state === "loading" || credits.length > 0) && (
            <DataTable
              columns={columns}
              rows={credits}
              rowKey={(c) => c.customerId}
              isLoading={state === "loading"}
              onRowClick={(c) => setViewing(c)}
              actionsRender={(c) => (
                <Button size="sm" variant="secondary" onClick={() => setCollecting(c)}>
                  <CircleDollarSign size={14} /> Collect
                </Button>
              )}
            />
          )}
        </div>

        {state === "success" && credits.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      <CreditDetailsDrawer credit={viewing} onClose={() => setViewing(null)} onCollectPayment={(c) => { setViewing(null); setCollecting(c); }} />
      <PaymentCollectionModal credit={collecting} onClose={() => setCollecting(null)} onCollected={handleCollected} />
    </div>
  );
}
