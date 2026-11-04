import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Eye, Pencil, PackagePlus, Trash2, Package, Store } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import {
  Button, SearchBar, FilterBar, Select, DataTable,
  Pagination, EmptyState, ErrorState, Drawer,
} from "../components/ui";
import type { Column } from "../components/ui/DataTable";
import { ProductFormDrawer } from "../components/products/ProductFormDrawer";
import { AdjustStockModal } from "../components/products/AdjustStockModal";
import { BranchAssignmentsDrawer } from "../components/products/BranchAssignmentsDrawer";
import { ProductStateBadges } from "../components/products/ProductStateBadges";
import { ProductPrice } from "../components/products/ProductPrice";
import { ConfirmModal } from "../components/ui/Overlay";
import * as productsApi from "../api/products";
import * as inventoryApi from "../api/inventory";
import type { Product, ProductFormValues, ProductAssignmentFilter, StockAdjustmentFormValues } from "../types";
import { useToast } from "../context/ToastContext";
import { friendlyError } from "../lib/apiMessages";

const PAGE_SIZE = 8;

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  // Which assignment state to list for the selected branch (backend default is "assigned").
  const [assignment, setAssignment] = useState<ProductAssignmentFilter>("assigned");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [categories, setCategories] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [branchesProduct, setBranchesProduct] = useState<Product | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Only the newest request may update the list, so a slow response for old
  // filters can never overwrite the current view.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setState("loading");
    try {
      const res = await productsApi.fetchProducts({ search, category, status, assignment, page, pageSize: PAGE_SIZE });
      if (seq !== loadSeq.current) return;
      setProducts(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      if (seq !== loadSeq.current) return;
      setState("error");
    }
  }, [search, category, status, assignment, page]);

  // Real categories come from the API (all pages), never from the demo store.
  // A failure here must not break the list — the filter just keeps what it has.
  const loadCategories = useCallback(async () => {
    try {
      setCategories(await productsApi.fetchProductCategories());
    } catch {
      /* keep the current categories */
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { setPage(1); }, [search, category, status, assignment]);

  async function handleCreateOrUpdate(values: ProductFormValues) {
    try {
      if (editingProduct) {
        await productsApi.updateProduct(editingProduct.id, values);
        showToast("Product updated.");
      } else {
        await productsApi.createProduct(values);
        showToast("Product added.");
      }
      load();
      loadCategories();
    } catch (err: any) {
      showToast(err?.message || "Couldn't save the product.", "error");
      throw err;
    }
  }

  // The modal submits a full adjustment (direction, quantity, MANDATORY
  // reason) — sent through POST /admin/inventory/adjustments, like Inventory.
  async function handleAdjustStock(values: StockAdjustmentFormValues) {
    if (!adjustingProduct) return;
    try {
      await inventoryApi.submitStockAdjustment(values);
      showToast("Stock updated.");
      load();
    } catch (err: any) {
      showToast(friendlyError(err, "Couldn't update stock."), "error");
      throw err;
    }
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    setDeleteSubmitting(true);
    try {
      await productsApi.softDeleteProduct(deletingProduct.id);
      showToast("Product deactivated in all branches.");
      setDeletingProduct(null);
      load();
    } catch (err: any) {
      showToast(err?.message || "Couldn't deactivate the product.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const columns: Column<Product>[] = [
    { key: "name", header: "Product", isPrimary: true, render: (p) => <span className="font-medium text-charcoal">{p.name}</span> },
    { key: "category", header: "Category", render: (p) => <span className="text-charcoal-muted">{p.category}</span> },
    { key: "price", header: "Selling Price", render: (p) => <ProductPrice product={p} /> },
    { key: "stock", header: "Stock", render: (p) => <span className={p.assigned === false ? "text-charcoal-muted" : undefined}>{p.stock} {p.unit}(s)</span> },
    { key: "threshold", header: "Low Stock At", render: (p) => <span className="text-charcoal-muted">{p.lowStockThreshold}</span> },
    { key: "status", header: "Status", render: (p) => <ProductStateBadges product={p} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your catalog, pricing, and stock levels."
        actions={
          <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
            <Plus size={16} /> Add Product
          </Button>
        }
      />

      <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
          <Select
            value={category} onChange={(e) => setCategory(e.target.value)}
            options={[{ label: "All categories", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))]}
            className="w-auto min-w-[150px]"
          />
          <Select
            value={status} onChange={(e) => setStatus(e.target.value)}
            options={[{ label: "All statuses", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}
            className="w-auto min-w-[130px]"
          />
          <Select
            aria-label="Branch assignment"
            value={assignment} onChange={(e) => setAssignment(e.target.value as ProductAssignmentFilter)}
            options={[{ label: "Assigned here", value: "assigned" }, { label: "Unassigned here", value: "unassigned" }, { label: "All products", value: "all" }]}
            className="w-auto min-w-[150px]"
          />
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load products." onRetry={load} />}
          {state !== "error" && products.length === 0 && state === "success" && (
            <EmptyState
              icon={<Package size={22} />}
              title="No products found"
              description={
                assignment === "unassigned" && !search && category === "all" && status === "all"
                  ? "Every product is assigned to this branch."
                  : search || category !== "all" || status !== "all" || assignment !== "assigned" ? "Try adjusting your filters." : "Add your first product to get started."
              }
              action={<Button size="sm" onClick={() => setFormOpen(true)}><Plus size={15} /> Add Product</Button>}
            />
          )}
          {(state === "loading" || products.length > 0) && (
            <DataTable
              columns={columns}
              rows={products}
              rowKey={(p) => p.id}
              isLoading={state === "loading"}
              onRowClick={(p) => setViewingProduct(p)}
              actionsRender={(p) => (
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setViewingProduct(p)} aria-label={`View ${p.name}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><Eye size={15} /></button>
                  <button onClick={() => { setEditingProduct(p); setFormOpen(true); }} aria-label={`Edit ${p.name}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><Pencil size={15} /></button>
                  <button onClick={() => setBranchesProduct(p)} aria-label={`Branches for ${p.name}`} title="Branches" className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><Store size={15} /></button>
                  <button
                    onClick={() => setAdjustingProduct(p)}
                    disabled={p.assigned === false}
                    title={p.assigned === false ? "Assign this product to the branch to adjust its stock" : undefined}
                    aria-label={`Adjust stock for ${p.name}`}
                    className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
                  ><PackagePlus size={15} /></button>
                  <button
                    onClick={() => setDeletingProduct(p)}
                    disabled={p.status === "inactive"}
                    title={p.status === "inactive" ? "Already inactive in all branches" : "Deactivate in all branches"}
                    aria-label={`Deactivate ${p.name} in all branches`}
                    className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-danger-soft hover:text-danger transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
                  ><Trash2 size={15} /></button>
                </div>
              )}
            />
          )}
        </div>

        {state === "success" && products.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      <ProductFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
        product={editingProduct}
        categories={categories}
      />

      <AdjustStockModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onSubmit={handleAdjustStock}
        product={adjustingProduct}
      />

      <BranchAssignmentsDrawer
        product={branchesProduct}
        onClose={() => setBranchesProduct(null)}
        onChanged={() => { load(); }}
      />

      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Deactivate in all branches?"
        description={`"${deletingProduct?.name}" will be marked inactive and hidden from billing at every branch. Stock and history are kept. This can be reversed by editing the product and setting it back to Active.`}
        confirmLabel="Deactivate"
        isDangerous
        isLoading={deleteSubmitting}
      />

      <Drawer
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        title={viewingProduct?.name ?? ""}
        subtitle={viewingProduct?.category}
      >
        {viewingProduct && (
          <dl className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Selling Price (this branch)</dt><dd className="font-semibold"><ProductPrice product={viewingProduct} /></dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Common Price</dt><dd className="font-semibold">₹{viewingProduct.sellingPrice.toLocaleString("en-IN")}</dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Cost Price</dt><dd className="font-semibold">{viewingProduct.costPrice ? `₹${viewingProduct.costPrice.toLocaleString("en-IN")}` : "—"}</dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Stock</dt><dd className="font-semibold">{viewingProduct.stock} {viewingProduct.unit}(s)</dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Low Stock Threshold</dt><dd className="font-semibold">{viewingProduct.lowStockThreshold}</dd></div>
            </div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Status at this branch</dt><dd><ProductStateBadges product={viewingProduct} /></dd></div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Last Updated</dt><dd className="text-sm text-charcoal-muted">{new Date(viewingProduct.updatedAt).toLocaleString("en-IN")}</dd></div>
          </dl>
        )}
      </Drawer>
    </div>
  );
}
