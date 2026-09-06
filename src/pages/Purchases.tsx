import { useEffect, useState, useCallback } from "react";
import { Plus, ShoppingCart, Download } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, SearchBar, FilterBar, DataTable, Pagination, EmptyState, ErrorState, StatusBadge, Drawer } from "../components/ui";
import type { Column } from "../components/ui/DataTable";
import { PurchaseFormDrawer } from "../components/purchases/PurchaseFormDrawer";
import * as purchasesApi from "../api/purchases";
import * as productsApi from "../api/products";
import type { Purchase, PurchaseFormValues, Product, ProductFormValues } from "../types";
import { useToast } from "../context/ToastContext";

const PAGE_SIZE = 8;

export default function Purchases() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [products, setProducts] = useState<Product[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await purchasesApi.fetchPurchases({ search, page, pageSize: PAGE_SIZE });
      setPurchases(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    productsApi.fetchProducts({ pageSize: 200 }).then((res) => setProducts(res.items));
  }, []);

  async function handleCreate(values: PurchaseFormValues) {
    try {
      await purchasesApi.createPurchase(values);
      showToast("Purchase recorded and stock updated.");
      load();
    } catch (err: any) {
      showToast(err?.message || "Couldn't save the purchase.", "error");
      throw err;
    }
  }

  // "Add Product in Catalog" -> new product, from inside the purchase
  // drawer, reusing the same create-product call the Products page uses.
  // Keeps `products` in sync so it's immediately selectable in this row.
  async function handleCreateProduct(values: ProductFormValues): Promise<Product> {
    const product = await productsApi.createProduct(values);
    setProducts((prev) => [...prev, product]);
    return product;
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await purchasesApi.exportPurchases({ search });
      showToast("Export downloaded.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't export purchases.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  const columns: Column<Purchase>[] = [
    { key: "invoice", header: "Invoice", isPrimary: true, render: (p) => <span className="font-medium text-charcoal">{p.invoiceNumber}</span> },
    { key: "supplier", header: "Supplier", render: (p) => <span className="text-charcoal-muted">{p.supplierName}</span> },
    { key: "date", header: "Date", render: (p) => <span>{p.purchaseDate}</span> },
    { key: "items", header: "Items", render: (p) => <span>{p.items.length} product{p.items.length !== 1 ? "s" : ""}</span> },
    { key: "amount", header: "Amount", render: (p) => <span className="font-semibold">₹{p.grandTotal.toLocaleString("en-IN")}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Purchases"
        subtitle="Record stock purchases and view your purchase history."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
              <Download size={16} /> {isExporting ? "Exporting…" : "Export"}
            </Button>
            <Button onClick={() => setFormOpen(true)}><Plus size={16} /> Create Purchase</Button>
          </div>
        }
      />

      <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by supplier or invoice..." />
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load purchase history." onRetry={load} />}
          {state === "success" && purchases.length === 0 && (
            <EmptyState
              icon={<ShoppingCart size={22} />}
              title="No purchases yet"
              description={search ? "Try a different search." : "Record your first purchase to start tracking stock."}
              action={<Button size="sm" onClick={() => setFormOpen(true)}><Plus size={15} /> Create Purchase</Button>}
            />
          )}
          {(state === "loading" || purchases.length > 0) && (
            <DataTable
              columns={columns}
              rows={purchases}
              rowKey={(p) => p.id}
              isLoading={state === "loading"}
              onRowClick={(p) => setViewingPurchase(p)}
            />
          )}
        </div>

        {state === "success" && purchases.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      <PurchaseFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        supplierSuggestions={purchasesApi.getSupplierSuggestions()}
        productSuggestions={products}
        productCategories={Array.from(new Set(products.map((p) => p.category)))}
        onCreateProduct={handleCreateProduct}
      />

      <Drawer
        isOpen={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={viewingPurchase?.invoiceNumber ?? ""}
        subtitle={viewingPurchase?.supplierName}
      >
        {viewingPurchase && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Purchase Date</p><p className="font-medium">{viewingPurchase.purchaseDate}</p></div>
              <div><p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Status</p><StatusBadge status={viewingPurchase.status} /></div>
            </div>

            <div>
              <p className="text-sm font-semibold text-charcoal mb-2">Products</p>
              <div className="space-y-2">
                {viewingPurchase.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-btn bg-ivory-soft px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{item.productName}</p>
                      <p className="text-xs text-charcoal-muted">{item.quantity} {item.unit} × ₹{item.purchasePrice.toLocaleString("en-IN")}</p>
                    </div>
                    <p className="text-sm font-semibold">₹{item.total.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-btn bg-ivory-soft p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm"><span className="text-charcoal-muted">Subtotal</span><span>₹{viewingPurchase.subtotal.toLocaleString("en-IN")}</span></div>
              {viewingPurchase.tax > 0 && <div className="flex items-center justify-between text-sm"><span className="text-charcoal-muted">Tax</span><span>₹{viewingPurchase.tax.toLocaleString("en-IN")}</span></div>}
              <div className="flex items-center justify-between font-semibold text-charcoal pt-1.5 border-t border-charcoal/10"><span>Grand Total</span><span>₹{viewingPurchase.grandTotal.toLocaleString("en-IN")}</span></div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
