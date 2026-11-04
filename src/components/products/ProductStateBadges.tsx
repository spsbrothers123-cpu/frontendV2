import { StatusBadge } from "../ui/StatusBadge";
import { getProductStates } from "./productState";
import type { Product } from "../../types";

export function ProductStateBadges({ product }: { product: Pick<Product, "status" | "assigned" | "stock"> }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {getProductStates(product).map((s) => <StatusBadge key={s} status={s} />)}
    </div>
  );
}
