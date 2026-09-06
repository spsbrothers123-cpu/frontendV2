import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Tabs, SearchBar, FilterBar, Select, DataTable, ErrorState, EmptyState, Pagination, StatusBadge } from "../components/ui";
import { formatCurrency } from "../components/ui/MiniChart";
import type { Column } from "../components/ui/DataTable";
import { HistoryDetailsDrawer } from "../components/history/HistoryDetailsDrawer";
import * as historyApi from "../api/history";
import type { HistoryRecord, HistoryType } from "../types";

const PAGE_SIZE = 10;
type TypeFilter = HistoryType | "all";

export default function History() {
  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [viewing, setViewing] = useState<HistoryRecord | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await historyApi.fetchHistory({ search, type, paymentMethod, page, pageSize: PAGE_SIZE });
      setRecords(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, type, paymentMethod, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, type, paymentMethod]);

  const columns: Column<HistoryRecord>[] = [
    { key: "reference", header: "Reference", isPrimary: true, render: (r) => <span className="font-medium text-charcoal">{r.reference}</span> },
    { key: "time", header: "Time", render: (r) => <span className="text-charcoal-muted">{new Date(r.time).toLocaleString("en-IN")}</span> },
    { key: "type", header: "Type", render: (r) => <StatusBadge status={r.type === "Sale" ? "Active" : r.type === "Purchase" ? "Received" : "Completed"} /> },
    { key: "party", header: "Customer/Supplier", render: (r) => <span>{r.party}</span> },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
    { key: "paymentMethod", header: "Payment Method", render: (r) => <span className="text-charcoal-muted">{r.paymentMethod}</span> },
    { key: "createdBy", header: "Created By", render: (r) => <span className="text-charcoal-muted">{r.createdBy}</span> },
  ];

  return (
    <div>
      <PageHeader title="History" subtitle="A unified view of every sale, purchase, and payment." />

      <div className="mb-5"><Tabs tabs={[
        { label: "All", value: "all" },
        { label: "Sales", value: "Sale" },
        { label: "Purchases", value: "Purchase" },
        { label: "Payments", value: "Payment" },
      ]} active={type} onChange={(v) => setType(v as TypeFilter)} /></div>

      <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by reference or customer..." />
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-auto min-w-[150px]"
            options={[
              { label: "All payment methods", value: "all" },
              { label: "Cash", value: "Cash" },
              { label: "UPI", value: "UPI" },
              { label: "Card", value: "Card" },
              { label: "Credit", value: "Credit" },
            ]} />
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load history." onRetry={load} />}
          {state === "success" && records.length === 0 && (
            <EmptyState icon={<HistoryIcon size={22} />} title="No records found" description="Try adjusting your filters." />
          )}
          {(state === "loading" || records.length > 0) && (
            <DataTable columns={columns} rows={records} rowKey={(r) => r.id} isLoading={state === "loading"} onRowClick={(r) => setViewing(r)} />
          )}
        </div>

        {state === "success" && records.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      <HistoryDetailsDrawer record={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
