import type { ConsolidationShop, ProductStockRow } from "../../types/consolidation";
import { fmtNum } from "./format";
import { useConsolidation } from "./ConsolidationContext";

// Product-wise stock distribution.
//   • All Shops  -> Product | Total Stock | one column per shop (columns come
//                   from the backend's `shops`, never hard-coded).
//   • One shop   -> Product | Available Stock for that shop only.
// Rows are exactly what the backend grouped: this component never merges
// products or variants itself. Wide tables scroll horizontally with the
// product column pinned.
export function ProductStockMatrix({
  shops,
  rows,
  selectedShop,
}: {
  shops: ConsolidationShop[];
  rows: ProductStockRow[];
  selectedShop: string;
}) {
  const { shopColor } = useConsolidation();
  const single = selectedShop !== "all";
  const visibleShops = single ? shops.filter((s) => s.id === selectedShop) : shops;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-charcoal/8">
            <th className="sticky left-0 z-10 bg-white text-left font-semibold text-charcoal-muted text-xs uppercase tracking-wide py-3 px-3">
              Product
            </th>
            {single ? (
              <th className="text-right font-semibold text-charcoal-muted text-xs uppercase tracking-wide py-3 px-3">
                Available Stock
              </th>
            ) : (
              <>
                <th className="text-right font-semibold text-charcoal-muted text-xs uppercase tracking-wide py-3 px-3">
                  Total Stock
                </th>
                {visibleShops.map((s) => (
                  <th key={s.id} className="text-right font-semibold text-charcoal-muted text-xs uppercase tracking-wide py-3 px-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: shopColor(s.id) }} aria-hidden="true" />
                      {s.name}
                    </span>
                  </th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-charcoal/6 last:border-0">
              <td className="sticky left-0 z-10 bg-white py-3.5 px-3 align-middle">
                <p className="font-semibold text-charcoal">
                  {row.name}
                  {row.variant ? <span className="font-normal text-charcoal-muted"> · {row.variant}</span> : null}
                </p>
                <p className="text-xs text-charcoal-muted">
                  {row.category ? `${row.category} · ` : ""}
                  {row.unit}
                </p>
              </td>
              {single ? (
                <td className="py-3.5 px-3 text-right tabular-nums font-semibold text-charcoal">
                  <Qty value={row.perShop[selectedShop] ?? row.totalStock} unit={row.unit} />
                </td>
              ) : (
                <>
                  <td className="py-3.5 px-3 text-right tabular-nums font-semibold text-charcoal">
                    <Qty value={row.totalStock} unit={row.unit} />
                  </td>
                  {visibleShops.map((s) => {
                    const v = row.perShop[s.id];
                    return (
                      <td key={s.id} className="py-3.5 px-3 text-right tabular-nums">
                        {v === null || v === undefined ? (
                          <span className="text-charcoal-muted" title="This shop doesn't carry this product">—</span>
                        ) : (
                          <span className={v <= 0 ? "text-danger font-medium" : "text-charcoal"}>{fmtNum(v)}</span>
                        )}
                      </td>
                    );
                  })}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Qty({ value, unit }: { value: number; unit: string }) {
  return (
    <span className={value <= 0 ? "text-danger" : undefined}>
      {fmtNum(value)} <span className="text-xs font-normal text-charcoal-muted">{unit}</span>
    </span>
  );
}
