import { useState } from "react";
import { Pagination, SearchBar } from "../../ui";
import { fetchProducts } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData } from "../ConsolidationContext";
import { InfoNote, Panel, SectionBoundary, SectionSkeleton } from "../shared";
import { ProductStockMatrix } from "../ProductStockMatrix";

const PAGE_SIZE = 20;

// Mounted with key={shop} by the page, so page/search reset when the shop
// filter changes. The date range is deliberately absent from the cache key
// and from the request: stock is always live inventory.
export function ProductsTab() {
  const { query } = useConsolidation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { state, retry } = useSectionData(
    `products|${query.shop}|${page}|${search}`,
    (signal) => fetchProducts(query, page, PAGE_SIZE, search, signal),
    "GET /admin/consolidation/products"
  );

  return (
    <div className="space-y-4">
      <InfoNote>Stock data always reflects current live inventory and is not affected by the date filter.</InfoNote>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products…" />
      <SectionBoundary
        state={state}
        onRetry={retry}
        skeleton={<SectionSkeleton />}
        isEmpty={(d) => d.rows.length === 0}
        emptyTitle={search ? "No matching products" : "No products found"}
        emptyDescription={search ? "Try a different search term." : "No stock records exist for this selection."}
      >
        {(d) => (
          <Panel>
            <ProductStockMatrix shops={d.shops} rows={d.rows} selectedShop={query.shop} />
            <Pagination page={page} pageSize={d.pageSize || PAGE_SIZE} total={d.total} onPageChange={setPage} />
          </Panel>
        )}
      </SectionBoundary>
    </div>
  );
}
