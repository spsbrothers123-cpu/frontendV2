import { useEffect, useState, useCallback } from "react";
import { Plus, ShoppingCart, Download, RotateCcw } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, SearchBar, FilterBar, DataTable, Pagination, EmptyState, ErrorState, StatusBadge, Drawer } from "../components/ui";
import type { Column } from "../components/ui/DataTable";
import { PurchaseFormDrawer } from "../components/purchases/PurchaseFormDrawer";
import { ReversePurchaseModal } from "../components/purchases/ReversePurchaseModal";
import * as purchasesApi from "../api/purchases";
import * as productsApi from "../api/products";
import type { Purchase, PurchaseFormValues, Product, ProductFormValues } from "../types";
import { useToast } from "../context/ToastContext";
import { useShop } from "../context/ShopContext";

// A reversal never rewrites `status`; show it as its own state.
const displayStatus = (p: Purchase) => (p.reversed ? "Reversed" : p.status);

const PAGE_SIZE = 8;

export default function Purchases() {
  const { showToast } = useToast();
  const { selectedShop } = useShop();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [categories, setCategories] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [reversingPurchase, setReversingPurchase] = useState<Purchase | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await purchasesApi.fetchPurchases({ search, page, pageSize: PAGE_SIZE });
      setPurchases(res.items);
      setTotal(res.total);
      // Keep an open details drawer in step with the refreshed row (e.g. after
      // a reversal that happened elsewhere).
      setViewingPurchase((cur) => (cur ? res.items.find((i) => i.id === cur.id) ?? cur : cur));
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);
  // Categories for the quick "add product" form. The product PICKER is not
  // loaded here: it belongs to the receiving branch chosen inside the form.
  useEffect(() => {
    productsApi.fetchProductCategories().then(setCategories).catch(() => setCategories([]));
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
  // drawer, reusing the same create-product call the Products page uses. The
  // drawer adds it to the receiving branch's picker itself.
  async function handleCreateProduct(values: ProductFormValues): Promise<Product> {
    const product = await productsApi.createProduct(values);
    setCategories((prev) => (prev.includes(product.category) ? prev : [...prev, product.category]));
    return product;
  }

  function handleReversed(updated: Purchase) {
    showToast(`Purchase reversed — stock removed from ${updated.receivingBranchName ?? "its receiving branch"}.`);
    setReversingPurchase(null);
    setViewingPurchase(updated);
    load();
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
    { key: "branch", header: "Receiving Branch", render: (p) => <span className="text-charcoal-muted">{p.receivingBranchName ?? "—"}</span> },
    { key: "date", header: "Date", render: (p) => <span>{p.purchaseDate}</span> },
    { key: "items", header: "Items", render: (p) => <span>{p.items.length} product{p.items.length !== 1 ? "s" : ""}</span> },
    { key: "amount", header: "Amount", render: (p) => <span className="font-semibold">₹{p.grandTotal.toLocaleString("en-IN")}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={displayStatus(p)} /> },
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
        {selectedShop && (
          <p className="mt-3 text-xs text-charcoal-muted">
            Showing purchases received at <strong>{selectedShop.name}</strong>. Switch branch in the header to see another branch's purchases.
          </p>
        )}

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
        loadCatalog={productsApi.fetchBranchCatalog}
        productCategories={categories}
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
              <div><p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Status</p><StatusBadge status={displayStatus(viewingPurchase)} /></div>
              <div className="col-span-2">
                <p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Receiving Branch</p>
                <p className="font-medium" data-testid="purchase-receiving-branch">{viewingPurchase.receivingBranchName ?? "—"}</p>
                <p className="text-xs text-charcoal-muted mt-0.5">Fixed when the purchase was saved. To correct it, reverse the purchase.</p>
              </div>
            </div>

            {viewingPurchase.reversed && viewingPurchase.reversal && (
              <div className="rounded-btn bg-amber-soft p-3.5 space-y-1.5" data-testid="purchase-reversal">
                <p className="text-sm font-semibold text-amber">Reversed</p>
                <p className="text-sm text-charcoal"><span className="text-charcoal-muted">Reason: </span>{viewingPurchase.reversal.reason}</p>
                <p className="text-xs text-charcoal-muted">Reversed on {new Date(viewingPurchase.reversal.reversedAt).toLocaleString("en-IN")}</p>
                <p className="text-xs text-charcoal-muted">The received stock was taken back out of {viewingPurchase.receivingBranchName ?? "the receiving branch"}. The original purchase is kept below unchanged.</p>
              </div>
            )}

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

            {!viewingPurchase.reversed && viewingPurchase.status === "Received" && (
              <div className="pt-1">
                <Button variant="secondary" onClick={() => setReversingPurchase(viewingPurchase)}>
                  <RotateCcw size={15} /> Reverse purchase
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {reversingPurchase && (
        <ReversePurchaseModal
          purchase={reversingPurchase}
          onClose={() => setReversingPurchase(null)}
          onReversed={handleReversed}
          onAlreadyReversed={load}
        />
      )}
    </div>
  );
}
