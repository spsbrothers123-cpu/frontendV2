import { RotateCw } from "lucide-react";
import { Tabs, Select, Input, Button } from "../ui";
import { toYmd } from "../../lib/consolidationDates";
import type { ConsolidationRangeKey, ConsolidationShop } from "../../types/consolidation";

const RANGE_TABS: { label: string; value: ConsolidationRangeKey }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "Custom Range", value: "custom" },
];

// Global Consolidation filters. Purely controlled: the owning page holds the
// state, and none of it is shared with the header's global shop selector.
export function ConsolidationFilters({
  shops,
  shop,
  onShopChange,
  range,
  onRangeChange,
  customFrom,
  customTo,
  onCustomChange,
  rangeError,
  onRefresh,
}: {
  shops: ConsolidationShop[];
  shop: string;
  onShopChange: (shopId: string) => void;
  range: ConsolidationRangeKey;
  onRangeChange: (r: ConsolidationRangeKey) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
  rangeError: string | null;
  onRefresh: () => void;
}) {
  const today = toYmd(new Date());
  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-56">
          <Select
            label="Shop"
            id="consolidation-shop"
            value={shop}
            onChange={(e) => onShopChange(e.target.value)}
            options={[{ label: "All Shops", value: "all" }, ...shops.map((s) => ({ label: s.name, value: s.id }))]}
          />
        </div>

        <div className="min-w-0 max-w-full">
          <p className="text-sm font-medium text-charcoal mb-1.5">Date</p>
          <div className="overflow-x-auto [&>div]:min-w-max [&_button]:whitespace-nowrap">
            <Tabs tabs={RANGE_TABS} active={range} onChange={(v) => onRangeChange(v as ConsolidationRangeKey)} />
          </div>
        </div>

        {range === "custom" && (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="w-40">
              <Input label="From" type="date" id="consolidation-from" value={customFrom} max={customTo || today}
                onChange={(e) => onCustomChange(e.target.value, customTo)} />
            </div>
            <div className="w-40">
              <Input label="To" type="date" id="consolidation-to" value={customTo} min={customFrom || undefined} max={today}
                onChange={(e) => onCustomChange(customFrom, e.target.value)} />
            </div>
          </div>
        )}

        <div className="sm:ml-auto">
          <Button variant="secondary" size="md" onClick={onRefresh} aria-label="Refresh data">
            <RotateCw size={15} /> Refresh
          </Button>
        </div>
      </div>
      {rangeError && <p className="text-xs text-danger mt-3" role="alert">{rangeError}</p>}
    </div>
  );
}
