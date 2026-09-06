import { useEffect, useState, useCallback } from "react";
import { Plus, Eye, Pencil, PackagePlus, Trash2, Package } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import {
  Button, SearchBar, FilterBar, Select, DataTable, StatusBadge,
  Pagination, EmptyState, ErrorState, Drawer,
} from "../components/ui";
import type { Column } from "../components/ui/DataTable";
import { ProductFormDrawer } from "../components/products/ProductFormDrawer";
import { AdjustStockModal } from "../components/products/AdjustStockModal";
import { ConfirmModal } from "../components/ui/Overlay";
import * as productsApi from "../api/products";
import type { Product, ProductFormValues } from "../types";
import { useToast } from "../context/ToastContext";

const PAGE_SIZE = 8;

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [categories, setCategories] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await productsApi.fetchProducts({ search, category, status, page, pageSize: PAGE_SIZE });
      setProducts(res.items);
      setTotal(res.total);
      setCategories(productsApi.getProductCategories());
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, category, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, status]);

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
    } catch (err: any) {
      showToast(err?.message || "Couldn't save the product.", "error");
      throw err;
    }
  }

  async function handleAdjustStock(delta: number) {
    if (!adjustingProduct) return;
    try {
      await productsApi.adjustProductStock(adjustingProduct.id, delta);
      showToast("Stock updated.");
      load();
    } catch (err: any) {
      showToast(err?.message || "Couldn't update stock.", "error");
      throw err;
    }
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    setDeleteSubmitting(true);
    try {
      await productsApi.softDeleteProduct(deletingProduct.id);
      showToast("Product marked inactive.");
      setDeletingProduct(null);
      load();
    } catch (err: any) {
      showToast(err?.message || "Couldn't remove the product.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const columns: Column<Product>[] = [
    { key: "name", header: "Product", isPrimary: true, render: (p) => <span className="font-medium text-charcoal">{p.name}</span> },
    { key: "category", header: "Category", render: (p) => <span className="text-charcoal-muted">{p.category}</span> },
    { key: "price", header: "Selling Price", render: (p) => <span>₹{p.sellingPrice.toLocaleString("en-IN")}</span> },
    { key: "stock", header: "Stock", render: (p) => <span>{p.stock} {p.unit}(s)</span> },
    { key: "threshold", header: "Low Stock At", render: (p) => <span className="text-charcoal-muted">{p.lowStockThreshold}</span> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status === "active" ? "Active" : "Inactive"} /> },
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
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load products." onRetry={load} />}
          {state !== "error" && products.length === 0 && state === "success" && (
            <EmptyState
              icon={<Package size={22} />}
              title="No products found"
              description={search || category !== "all" || status !== "all" ? "Try adjusting your filters." : "Add your first product to get started."}
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
                  <button onClick={() => setAdjustingProduct(p)} aria-label={`Adjust stock for ${p.name}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><PackagePlus size={15} /></button>
                  <button onClick={() => setDeletingProduct(p)} aria-label={`Remove ${p.name}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-danger-soft hover:text-danger transition-colors duration-150"><Trash2 size={15} /></button>
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

      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Remove this product?"
        description={`"${deletingProduct?.name}" will be marked inactive and hidden from billing. This can be reversed by editing the product later.`}
        confirmLabel="Remove"
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
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Selling Price</dt><dd className="font-semibold">₹{viewingProduct.sellingPrice.toLocaleString("en-IN")}</dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Cost Price</dt><dd className="font-semibold">{viewingProduct.costPrice ? `₹${viewingProduct.costPrice.toLocaleString("en-IN")}` : "—"}</dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Stock</dt><dd className="font-semibold">{viewingProduct.stock} {viewingProduct.unit}(s)</dd></div>
              <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Low Stock Threshold</dt><dd className="font-semibold">{viewingProduct.lowStockThreshold}</dd></div>
            </div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Status</dt><dd><StatusBadge status={viewingProduct.status === "active" ? "Active" : "Inactive"} /></dd></div>
            <div><dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Last Updated</dt><dd className="text-sm text-charcoal-muted">{new Date(viewingProduct.updatedAt).toLocaleString("en-IN")}</dd></div>
          </dl>
        )}
      </Drawer>
    </div>
  );
}
