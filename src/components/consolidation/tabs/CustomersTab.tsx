import { useState } from "react";
import { DataTable, Pagination, SearchBar } from "../../ui";
import type { Column } from "../../ui";
import { formatCurrency } from "../../ui/MiniChart";
import { fetchCustomers } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData, dateScopeKey } from "../ConsolidationContext";
import { Panel, SectionBoundary, SectionSkeleton, ShopTag } from "../shared";
import { fmtNum } from "../format";
import { CreditSummaryPanel } from "../CreditSummaryPanel";
import type { CustomerRow } from "../../../types/consolidation";

const PAGE_SIZE = 20;

// Mounted with key={shop}. Records are shown exactly as the backend returns
// them — one row per branch customer record, tagged with its shop — and are
// never merged across branches.
export function CustomersTab() {
  const { query } = useConsolidation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { state, retry } = useSectionData(
    `customers|${dateScopeKey(query)}|${page}|${search}`,
    (signal) => fetchCustomers(query, page, PAGE_SIZE, search, signal),
    "GET /admin/consolidation/customers"
  );

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      isPrimary: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-charcoal">{r.name}</p>
          {r.phone && <p className="text-xs text-charcoal-muted">{r.phone}</p>}
        </div>
      ),
    },
    { key: "shop", header: "Shop", render: (r) => <ShopTag shopId={r.shopId} name={r.shopName} /> },
    {
      key: "purchases",
      header: "Purchases",
      className: "tabular-nums",
      render: (r) => `${fmtNum(r.purchaseCount)} · ${formatCurrency(r.purchaseTotal)}`,
    },
    {
      key: "credit",
      header: "Outstanding Credit",
      className: "tabular-nums",
      render: (r) => (
        <span className={r.outstandingCredit > 0 ? "font-semibold text-danger" : "text-charcoal-muted"}>
          {formatCurrency(r.outstandingCredit)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionBoundary state={state} onRetry={retry} skeleton={<SectionSkeleton />}>
        {(d) => (
          <>
            <CreditSummaryPanel summary={d.summary} />
            <div className="space-y-4">
              <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search customers…" />
              {d.rows.length === 0 ? (
                <Panel>
                  <p className="text-sm text-charcoal-muted text-center py-8">
                    {search ? "No customers match your search." : "No customer records for this selection."}
                  </p>
                </Panel>
              ) : (
                <Panel title="Customer Records">
                  <DataTable columns={columns} rows={d.rows} rowKey={(r) => `${r.shopId}:${r.id}`} />
                  <Pagination page={page} pageSize={d.pageSize || PAGE_SIZE} total={d.total} onPageChange={setPage} />
                </Panel>
              )}
            </div>
          </>
        )}
      </SectionBoundary>
    </div>
  );
}
