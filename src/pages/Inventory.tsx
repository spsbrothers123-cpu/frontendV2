import { useCallback, useEffect, useState } from "react";
import { Boxes, PackageX, PackageCheck, Wallet, Plus, PackagePlus, AlertTriangle, Eye } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import {
  StatCard, CardSkeleton, ErrorState, EmptyState, Tabs, SearchBar, FilterBar, Select,
  DataTable, StatusBadge, Pagination, Button, Drawer,
} from "../components/ui";
import { formatCurrency } from "../components/ui/MiniChart";
import type { Column } from "../components/ui/DataTable";
import { StockAdjustmentDrawer } from "../components/inventory/StockAdjustmentDrawer";
import * as inventoryApi from "../api/inventory";
import * as productsApi from "../api/products";
import type { Product, InventoryKpis, StockMovement, LowStockItem, StockAdjustmentFormValues } from "../types";
import { useToast } from "../context/ToastContext";

type TabValue = "overview" | "movement" | "adjustments" | "alerts";
const PAGE_SIZE = 8;

export default function Inventory() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabValue>("overview");

  const [kpis, setKpis] = useState<InventoryKpis | null>(null);
  const [kpisState, setKpisState] = useState<"loading" | "success" | "error">("loading");

  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const loadKpis = useCallback(async () => {
    setKpisState("loading");
    try {
      setKpis(await inventoryApi.fetchInventoryKpis());
      setKpisState("success");
    } catch {
      setKpisState("error");
    }
  }, []);

  const loadAllProducts = useCallback(async () => {
    try {
      const res = await productsApi.fetchProducts({ page: 1, pageSize: 500 });
      setAllProducts(res.items);
    } catch {
      // adjustment drawer will just show an empty product list; the
      // Overview tab surfaces the real error state separately.
    }
  }, []);

  useEffect(() => { loadKpis(); loadAllProducts(); }, [loadKpis, loadAllProducts]);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track stock levels, movement, and adjustments across your catalog." />

      {kpisState === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}
      {kpisState === "error" && (
        <div className="mb-6 rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load inventory summary." onRetry={loadKpis} /></div>
      )}
      {kpisState === "success" && kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Boxes size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Items" value={String(kpis.totalItems)} trend={0} comparisonLabel="active products" />
          <StatCard icon={<AlertTriangle size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Low Stock" value={String(kpis.lowStock)} trend={0} comparisonLabel="need restocking" />
          <StatCard icon={<PackageX size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Out of Stock" value={String(kpis.outOfStock)} trend={0} comparisonLabel="unavailable to sell" />
          <StatCard icon={<Wallet size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Stock Value" value={formatCurrency(kpis.stockValue)} trend={0} comparisonLabel="at cost price" />
        </div>
      )}

      <div className="mb-5"><Tabs tabs={[
        { label: "Overview", value: "overview" },
        { label: "Stock Movement", value: "movement" },
        { label: "Adjustments", value: "adjustments" },
        { label: "Alerts", value: "alerts" },
      ]} active={tab} onChange={(v) => setTab(v as TabValue)} /></div>

      {tab === "overview" && <OverviewTab onAdjust={() => setTab("adjustments")} />}
      {tab === "movement" && <MovementTab />}
      {tab === "adjustments" && (
        <AdjustmentsTab
          products={allProducts}
          onAdjusted={() => { loadKpis(); loadAllProducts(); showToast("Stock updated."); }}
        />
      )}
      {tab === "alerts" && <AlertsTab />}
    </div>
  );
}

// ── Overview ─────────────────────────────────────────
function OverviewTab({ onAdjust }: { onAdjust: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [viewing, setViewing] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await inventoryApi.fetchInventoryOverview({ search, category, status, page, pageSize: PAGE_SIZE });
      setProducts(res.items);
      setTotal(res.total);
      setCategories(await import("../api/products").then((m) => m.getProductCategories()));
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, category, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, status]);

  const columns: Column<Product>[] = [
    { key: "name", header: "Product", isPrimary: true, render: (p) => <span className="font-medium text-charcoal">{p.name}</span> },
    { key: "category", header: "Category", render: (p) => <span className="text-charcoal-muted">{p.category}</span> },
    { key: "stock", header: "Current Stock", render: (p) => <span>{p.stock}</span> },
    { key: "unit", header: "Unit", render: (p) => <span className="text-charcoal-muted capitalize">{p.unit}</span> },
    { key: "threshold", header: "Low Stock Threshold", render: (p) => <span className="text-charcoal-muted">{p.lowStockThreshold}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={inventoryApi.getInventoryStatusLabel(p)} /> },
    { key: "updatedAt", header: "Last Updated", render: (p) => <span className="text-charcoal-muted">{new Date(p.updatedAt).toLocaleDateString("en-IN")}</span> },
  ];

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search inventory..." />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-[150px]"
          options={[{ label: "All categories", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))]} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[150px]"
          options={[
            { label: "All statuses", value: "all" },
            { label: "In Stock", value: "in_stock" },
            { label: "Low Stock", value: "low_stock" },
            { label: "Out of Stock", value: "out_of_stock" },
          ]} />
      </FilterBar>

      <div className="mt-4">
        {state === "error" && <ErrorState message="Couldn't load inventory." onRetry={load} />}
        {state === "success" && products.length === 0 && (
          <EmptyState icon={<Boxes size={22} />} title="No items found" description="Try adjusting your filters." />
        )}
        {(state === "loading" || products.length > 0) && (
          <DataTable
            columns={columns}
            rows={products}
            rowKey={(p) => p.id}
            isLoading={state === "loading"}
            onRowClick={(p) => setViewing(p)}
            actionsRender={(p) => (
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => setViewing(p)} aria-label={`View ${p.name}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><Eye size={15} /></button>
                <button onClick={onAdjust} aria-label={`Adjust stock for ${p.name}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><PackagePlus size={15} /></button>
              </div>
            )}
          />
        )}
      </div>

      {state === "success" && products.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      )}

      <Drawer isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.name ?? ""} subtitle={viewing?.category}>
        {viewing && (
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Current Stock</dt><dd className="font-semibold">{viewing.stock} {viewing.unit}(s)</dd></div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Low Stock Threshold</dt><dd className="font-semibold">{viewing.lowStockThreshold}</dd></div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Status</dt><dd><StatusBadge status={inventoryApi.getInventoryStatusLabel(viewing)} /></dd></div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Last Updated</dt><dd className="text-sm text-charcoal-muted">{new Date(viewing.updatedAt).toLocaleString("en-IN")}</dd></div>
          </dl>
        )}
      </Drawer>
    </div>
  );
}

// ── Stock Movement ────────────────────────────────────
function MovementTab() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await inventoryApi.fetchStockMovements({ search, type, page, pageSize: PAGE_SIZE });
      setMovements(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, type, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, type]);

  const columns: Column<StockMovement>[] = [
    { key: "product", header: "Product", isPrimary: true, render: (m) => <span className="font-medium text-charcoal">{m.productName}</span> },
    { key: "date", header: "Date", render: (m) => <span className="text-charcoal-muted">{new Date(m.date).toLocaleString("en-IN")}</span> },
    { key: "type", header: "Movement Type", render: (m) => <StatusBadge status={m.type} /> },
    { key: "quantity", header: "Quantity", render: (m) => <span className={m.quantity >= 0 ? "text-olive font-semibold" : "text-danger font-semibold"}>{m.quantity > 0 ? "+" : ""}{m.quantity}</span> },
    { key: "previousStock", header: "Previous Stock", render: (m) => <span className="text-charcoal-muted">{m.previousStock}</span> },
    { key: "newStock", header: "New Stock", render: (m) => <span className="font-medium">{m.newStock}</span> },
    { key: "reason", header: "Reason", render: (m) => <span className="text-charcoal-muted">{m.reason}</span> },
    { key: "user", header: "User", render: (m) => <span className="text-charcoal-muted">{m.user}</span> },
  ];

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by product or reason..." />
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto min-w-[150px]"
          options={[
            { label: "All types", value: "all" },
            { label: "Stock In", value: "IN" },
            { label: "Stock Out", value: "OUT" },
            { label: "Adjustment", value: "ADJUSTMENT" },
          ]} />
      </FilterBar>
      <div className="mt-4">
        {state === "error" && <ErrorState message="Couldn't load stock movement." onRetry={load} />}
        {state === "success" && movements.length === 0 && (
          <EmptyState title="No stock movement yet" description="Purchases, sales, and adjustments will show up here." />
        )}
        {(state === "loading" || movements.length > 0) && (
          <DataTable columns={columns} rows={movements} rowKey={(m) => m.id} isLoading={state === "loading"} />
        )}
      </div>
      {state === "success" && movements.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      )}
    </div>
  );
}

// ── Adjustments ────────────────────────────────────────
function AdjustmentsTab({ products, onAdjusted }: { products: Product[]; onAdjusted: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<StockMovement[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await inventoryApi.fetchStockMovements({ type: "ADJUSTMENT", page: 1, pageSize: 50 });
      setAdjustments(res.items);
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(values: StockAdjustmentFormValues) {
    await inventoryApi.submitStockAdjustment(values);
    load();
    onAdjusted();
  }

  const columns: Column<StockMovement>[] = [
    { key: "product", header: "Product", isPrimary: true, render: (m) => <span className="font-medium text-charcoal">{m.productName}</span> },
    { key: "date", header: "Date", render: (m) => <span className="text-charcoal-muted">{new Date(m.date).toLocaleString("en-IN")}</span> },
    { key: "quantity", header: "Change", render: (m) => <span className={m.quantity >= 0 ? "text-olive font-semibold" : "text-danger font-semibold"}>{m.quantity > 0 ? "+" : ""}{m.quantity}</span> },
    { key: "newStock", header: "New Stock", render: (m) => <span className="font-medium">{m.newStock}</span> },
    { key: "reason", header: "Reason", render: (m) => <span className="text-charcoal-muted">{m.reason}</span> },
    { key: "user", header: "By", render: (m) => <span className="text-charcoal-muted">{m.user}</span> },
  ];

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-charcoal">Stock Adjustments</h2>
          <p className="text-sm text-charcoal-muted">Corrections for breakage, spoilage, or count discrepancies.</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}><Plus size={16} /> New Adjustment</Button>
      </div>

      {state === "error" && <ErrorState message="Couldn't load adjustment history." onRetry={load} />}
      {state === "success" && adjustments.length === 0 && (
        <EmptyState title="No adjustments yet" description="Adjustments you submit will appear here." action={<Button size="sm" onClick={() => setDrawerOpen(true)}><Plus size={15} /> New Adjustment</Button>} />
      )}
      {(state === "loading" || adjustments.length > 0) && (
        <DataTable columns={columns} rows={adjustments} rowKey={(m) => m.id} isLoading={state === "loading"} />
      )}

      <StockAdjustmentDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleSubmit} products={products} />
    </div>
  );
}

// ── Alerts ───────────────────────────────────────────
function AlertsTab() {
  const [alerts, setAlerts] = useState<LowStockItem[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setState("loading");
    try {
      setAlerts(await inventoryApi.fetchLowStockAlerts());
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns: Column<LowStockItem>[] = [
    { key: "product", header: "Product", isPrimary: true, render: (a) => <span className="font-medium text-charcoal">{a.productName}</span> },
    { key: "stock", header: "Current Stock", render: (a) => <span>{a.currentStock} {a.unit}(s)</span> },
    { key: "threshold", header: "Threshold", render: (a) => <span className="text-charcoal-muted">{a.threshold}</span> },
    { key: "severity", header: "Severity", render: (a) => <StatusBadge status={a.status} /> },
    { key: "restock", header: "Last Restock", render: () => <span className="text-charcoal-muted">—</span> },
  ];

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      {state === "error" && <ErrorState message="Couldn't load stock alerts." onRetry={load} />}
      {state === "success" && alerts.length === 0 && (
        <EmptyState icon={<PackageCheck size={22} />} title="Stock levels look healthy" description="No products are below their threshold right now." />
      )}
      {(state === "loading" || alerts.length > 0) && (
        <DataTable
          columns={columns}
          rows={alerts}
          rowKey={(a) => a.productId}
          isLoading={state === "loading"}
          actionsRender={() => (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="secondary" onClick={() => showToast("Restocking will open a purchase entry once wired to the backend.", "info")}>Restock</Button>
            </div>
          )}
        />
      )}
    </div>
  );
}
