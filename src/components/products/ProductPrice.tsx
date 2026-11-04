import type { Product } from "../../types";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** The selected branch's price source: a branch override, or the common price. */
export function PriceSourceTag({ overridden }: { overridden: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        overridden ? "bg-amber-soft text-amber" : "bg-charcoal/8 text-charcoal-muted"
      }`}
    >
      {overridden ? "Branch override" : "Common price"}
    </span>
  );
}

/**
 * Effective selling price at the selected branch. Falls back to the common
 * price when the backend didn't send branch fields (create/update responses).
 */
export function ProductPrice({ product }: { product: Pick<Product, "sellingPrice" | "priceOverride" | "effectivePrice"> }) {
  const overridden = product.priceOverride != null;
  const effective = product.effectivePrice ?? product.sellingPrice;
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className={overridden ? "font-semibold text-charcoal" : undefined}>{inr(effective)}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriceSourceTag overridden={overridden} />
        {overridden && <span className="text-xs text-charcoal-muted">Common {inr(product.sellingPrice)}</span>}
      </div>
    </div>
  );
}
