import { useState } from "react";
import { DataTable, Pagination, StatusBadge } from "../../ui";
import type { Column } from "../../ui";
import { fetchLowStock } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData } from "../ConsolidationContext";
import { InfoNote, Panel, SectionBoundary, SectionSkeleton, ShopTag } from "../shared";
import { fmtNum } from "../format";
import type { LowStockRow } from "../../../types/consolidation";

const PAGE_SIZE = 20;

// Read-only. Live inventory: no date param, and no stock-modifying actions.
export function LowStockTab() {
  const { query } = useConsolidation();
  const [page, setPage] = useState(1);

  const { state, retry } = useSectionData(
    `low-stock|${query.shop}|${page}`,
    (signal) => fetchLowStock(query, page, PAGE_SIZE, signal),
    "GET /admin/consolidation/low-stock"
  );

  const columns: Column<LowStockRow>[] = [
    { key: "product", header: "Product", isPrimary: true, render: (r) => r.productName },
    { key: "shop", header: "Shop", render: (r) => <ShopTag shopId={r.shopId} name={r.shopName} /> },
    {
      key: "available",
      header: "Available",
      className: "tabular-nums",
      render: (r) => (
        <span className={r.available <= 0 ? "font-semibold text-danger" : "font-semibold text-amber"}>
          {fmtNum(r.available)} {r.unit}
        </span>
      ),
    },
    { key: "threshold", header: "Minimum Threshold", className: "tabular-nums", render: (r) => `${fmtNum(r.threshold)} ${r.unit}` },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <InfoNote>Stock levels are live inventory and are not affected by the date filter.</InfoNote>
      <SectionBoundary
        state={state}
        onRetry={retry}
        skeleton={<SectionSkeleton />}
        isEmpty={(d) => d.rows.length === 0}
        emptyTitle="No low-stock items"
        emptyDescription="Every product is above its minimum threshold."
      >
        {(d) => (
          <Panel>
            <DataTable columns={columns} rows={d.rows} rowKey={(r) => r.id} />
            <Pagination page={page} pageSize={d.pageSize || PAGE_SIZE} total={d.total} onPageChange={setPage} />
          </Panel>
        )}
      </SectionBoundary>
    </div>
  );
}
