import { useEffect, useState } from "react";
import { Drawer, Button, Input, Select } from "../ui";
import { useActiveCashiers } from "../../hooks/useActiveCashiers";
import type { Product, ProductFormValues, ProductUnit } from "../../types";

const unitOptions: { label: string; value: ProductUnit }[] = [
  { label: "kg", value: "kg" }, { label: "g", value: "g" }, { label: "litre", value: "litre" },
  { label: "ml", value: "ml" }, { label: "piece", value: "piece" }, { label: "tray", value: "tray" }, { label: "box", value: "box" },
];

const emptyForm: ProductFormValues = {
  name: "", category: "", sellingPrice: "", costPrice: "", stock: "", unit: "tray", lowStockThreshold: "", status: "active", cashierId: "",
};

interface ProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  product?: Product | null;
  categories: string[];
}

export function ProductFormDrawer({ isOpen, onClose, onSubmit, product, categories }: ProductFormDrawerProps) {
  const [values, setValues] = useState<ProductFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Cashier-level inventory foundation: only relevant when creating a
  // brand-new product with an initial stock quantity — editing an
  // existing product never touches stock at all anymore (see the note
  // above the Stock field below).
  const isCreating = !product;
  const { cashiers, isLoading: cashiersLoading, error: cashiersError } = useActiveCashiers(isOpen && isCreating);

  useEffect(() => {
    if (isOpen) {
      setValues(
        product
          ? {
              name: product.name, category: product.category, sellingPrice: product.sellingPrice,
              costPrice: product.costPrice ?? "", stock: product.stock, unit: product.unit,
              lowStockThreshold: product.lowStockThreshold, status: product.status, cashierId: "",
            }
          : emptyForm
      );
      setErrors({});
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (isOpen && isCreating && !values.cashierId && cashiers.length === 1) {
      setValues((v) => ({ ...v, cashierId: cashiers[0].id }));
    }
  }, [isOpen, isCreating, cashiers, values.cashierId]);

  const needsCashier = isCreating && Number(values.stock) > 0;

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Product name is required.";
    if (!values.category.trim()) next.category = "Category is required.";
    if (values.sellingPrice === "" || Number(values.sellingPrice) < 0) next.sellingPrice = "Enter a valid price.";
    if (isCreating) {
      if (values.stock === "" || Number(values.stock) < 0 || !Number.isFinite(Number(values.stock))) next.stock = "Enter a valid stock quantity.";
      if (needsCashier && !values.cashierId) next.cashierId = "Select which cashier should receive this stock.";
    }
    if (values.lowStockThreshold === "" || Number(values.lowStockThreshold) < 0) next.lowStockThreshold = "Enter a valid threshold.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // guard against duplicate submissions
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Editing never sends stock/cashierId — the backend's PUT endpoint
      // doesn't accept them (stock only ever moves through Adjust Stock,
      // which is cashier-scoped). Sending the product's current stock
      // back here would be a no-op at best and misleading at worst.
      await onSubmit(isCreating ? values : { ...values, stock: product!.stock, cashierId: undefined });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}
      subtitle={product ? `Editing ${product.name}` : "Create a new product in your catalog"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>{product ? "Save changes" : "Add product"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Product name" required value={values.name} error={errors.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. White Eggs (Tray)"
        />
        <Input
          label="Category" required value={values.category} error={errors.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          placeholder="e.g. Eggs, Packaging"
          list="category-suggestions"
        />
        <datalist id="category-suggestions">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Selling price (₹)" required type="number" min={0} step="0.01" value={values.sellingPrice} error={errors.sellingPrice}
            onChange={(e) => setValues((v) => ({ ...v, sellingPrice: e.target.value === "" ? "" : Number(e.target.value) }))}
          />
          <Input
            label="Cost price (₹)" type="number" min={0} step="0.01" value={values.costPrice} hint="Optional"
            onChange={(e) => setValues((v) => ({ ...v, costPrice: e.target.value === "" ? "" : Number(e.target.value) }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isCreating ? (
            <Input
              label="Initial stock quantity" required type="number" min={0} value={values.stock} error={errors.stock}
              onChange={(e) => setValues((v) => ({ ...v, stock: e.target.value === "" ? "" : Number(e.target.value) }))}
            />
          ) : (
            <Input
              label="Stock quantity" value={`${product!.stock} (total across cashiers)`} disabled
              hint="Use Adjust Stock to change a specific cashier's stock."
            />
          )}
          <Select
            label="Unit" required options={unitOptions} value={values.unit}
            onChange={(e) => setValues((v) => ({ ...v, unit: e.target.value as ProductUnit }))}
          />
        </div>

        {needsCashier && (
          <Select
            label="Cashier receiving this stock"
            required
            hint="Every cashier keeps their own separate stock — pick who this initial stock belongs to."
            value={values.cashierId ?? ""}
            error={errors.cashierId}
            onChange={(e) => setValues((v) => ({ ...v, cashierId: e.target.value }))}
            disabled={cashiersLoading}
            options={[
              { label: cashiersLoading ? "Loading cashiers…" : "Select a cashier…", value: "" },
              ...cashiers.map((c) => ({ label: c.name, value: c.id })),
            ]}
          />
        )}
        {needsCashier && !cashiersLoading && cashiers.length === 0 && (
          <p className="text-sm text-charcoal-muted">No active cashiers at this shop yet — add one first, or set initial stock to 0.</p>
        )}
        {needsCashier && cashiersError && <p role="alert" className="text-sm text-danger">{cashiersError}</p>}

        <Input
          label="Low stock threshold" required type="number" min={0} value={values.lowStockThreshold} error={errors.lowStockThreshold}
          hint="Get flagged on the dashboard when stock falls at or below this"
          onChange={(e) => setValues((v) => ({ ...v, lowStockThreshold: e.target.value === "" ? "" : Number(e.target.value) }))}
        />

        <Select
          label="Status" required
          options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}
          value={values.status}
          onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as "active" | "inactive" }))}
        />
      </form>
    </Drawer>
  );
}
