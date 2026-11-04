import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer, Button, Input, ConfirmModal } from "../ui";
import { StatusBadge } from "../ui/StatusBadge";
import * as productsApi from "../../api/products";
import { useToast } from "../../context/ToastContext";
import { PriceSourceTag } from "./ProductPrice";
import type { Product, ProductBranchAssignments, BranchAssignment } from "../../types";
import { friendlyError } from "../../lib/apiMessages";

interface Props {
  product: Product | null;
  onClose: () => void;
  /** Called after any change so the Products list can refresh. */
  onChanged: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// Mirrors the backend limit (DECIMAL(12,2)); the backend remains the authority.
const MAX_PRICE = 9_999_999_999.99;
const PRICE_FORMAT = /^\d+(\.\d{1,2})?$/;

/** Parsed draft: null = blank (inherit), NaN = invalid, number = override. */
function parseDraft(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  if (!PRICE_FORMAT.test(t)) return NaN;
  const n = Number(t);
  return Number.isFinite(n) && n <= MAX_PRICE ? n : NaN;
}

/**
 * Phase 2 Stage 2.8 — where the Central Admin controls, per branch:
 *   - whether the global product is assigned (visible to that branch's cashier);
 *   - an optional branch price override (blank = inherit the common price).
 *
 * Independent of the Global Shop Selector: it lists EVERY branch. Unassigning
 * only hides the product — stock and history are preserved and restored on
 * re-assignment — and asks for confirmation first. Resetting an override also
 * asks first (the branch reverts to the common price; completed bills never
 * change). The backend enforces Central-Admin-only; a refusal is shown as a
 * permission message here, nothing is faked client-side.
 */
export function BranchAssignmentsDrawer({ product, onClose, onChanged }: Props) {
  const { showToast } = useToast();
  const [data, setData] = useState<ProductBranchAssignments | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // shopId currently saving
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingUnassign, setPendingUnassign] = useState<BranchAssignment | null>(null);
  const [pendingReset, setPendingReset] = useState<BranchAssignment | null>(null);
  // Ignore responses that arrive after the product changed or the drawer closed.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!product) return;
    const seq = ++loadSeq.current;
    setState("loading");
    try {
      const res = await productsApi.fetchProductBranchAssignments(product.id);
      if (seq !== loadSeq.current) return;
      setData(res);
      setDrafts(Object.fromEntries(res.branches.map((b) => [b.shopId, b.priceOverride != null ? String(b.priceOverride) : ""])));
      setState("ready");
    } catch (err: any) {
      if (seq !== loadSeq.current) return;
      setErrorMsg(err?.message || "Couldn't load branch assignments.");
      setState("error");
    }
  }, [product]);

  useEffect(() => {
    setPendingUnassign(null);
    setPendingReset(null);
    if (product) load();
    else { loadSeq.current++; setData(null); }
  }, [product, load]);

  async function applyAssignment(b: BranchAssignment, assigned: boolean) {
    if (!product || busy) return;
    setBusy(b.shopId);
    try {
      await productsApi.setProductAssignment(product.id, b.shopId, assigned);
      showToast(assigned ? `Assigned to ${b.name}.` : `Unassigned from ${b.name}. Stock and history are kept.`);
      await load();
      onChanged();
    } catch (err: any) {
      showToast(friendlyError(err, "Couldn't update the assignment."), "error");
    } finally {
      setBusy(null);
    }
  }

  // Assigning is non-destructive and goes straight through; unassigning hides
  // the product from that branch's cashier, so it asks first.
  function toggle(b: BranchAssignment) {
    if (busy) return;
    if (b.assigned) setPendingUnassign(b);
    else void applyAssignment(b, true);
  }

  async function confirmUnassign() {
    const b = pendingUnassign;
    if (!b) return;
    setPendingUnassign(null);
    await applyAssignment(b, false);
  }

  async function persistPrice(b: BranchAssignment, value: number | null) {
    if (!product || busy) return;
    setBusy(b.shopId);
    try {
      const res = await productsApi.setBranchPriceOverride(product.id, b.shopId, value);
      showToast(
        !res.changed
          ? "No change."
          : value === null
            ? `Override cleared — ${b.name} now uses the common price.`
            : `Override saved for ${b.name}: ${inr(res.effectivePrice)}.`
      );
      await load();
      onChanged();
    } catch (err: any) {
      showToast(friendlyError(err, "Couldn't save the price override."), "error");
    } finally {
      setBusy(null);
    }
  }

  function isUnchanged(b: BranchAssignment): boolean {
    const v = parseDraft(drafts[b.shopId] ?? "");
    return v === (b.priceOverride ?? null);
  }

  // Save: validates locally, then either sets the override or — when the field
  // was blanked on an existing override — asks to reset it.
  function savePrice(b: BranchAssignment) {
    if (!product || busy) return;
    const v = parseDraft(drafts[b.shopId] ?? "");
    if (Number.isNaN(v)) {
      showToast(`Enter a valid price: 0 or more, up to ${inr(MAX_PRICE)}, with at most 2 decimal places.`, "error");
      return;
    }
    if (v === (b.priceOverride ?? null)) return; // nothing changed — send nothing
    if (v === null) setPendingReset(b);
    else void persistPrice(b, v);
  }

  async function confirmReset() {
    const b = pendingReset;
    if (!b) return;
    setPendingReset(null);
    await persistPrice(b, null);
  }

  return (
    <>
      <Drawer
        isOpen={!!product}
        onClose={onClose}
        title="Branches & Pricing"
        subtitle={product ? `${product.name} — assignment and price per branch` : ""}
      >
        {state === "loading" && (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>
        )}
        {state === "error" && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">{errorMsg}</p>
            <Button variant="secondary" size="sm" onClick={load}>Try again</Button>
          </div>
        )}
        {state === "ready" && data && (
          <div className="space-y-4">
            <div className="rounded-btn bg-ivory-soft p-3.5 text-sm">
              <p className="text-charcoal-muted">Common selling price</p>
              <p className="font-display font-bold text-charcoal">{inr(data.sellingPrice)}</p>
              <p className="text-xs text-charcoal-muted mt-1">
                Branches without an override use this price. Changing it keeps every override.
              </p>
              {data.status === "inactive" && (
                <p className="text-xs text-charcoal-muted mt-1">This product is inactive catalog-wide.</p>
              )}
            </div>

            {data.branches.map((b) => {
              const saving = busy === b.shopId;
              return (
                <div key={b.shopId} className="rounded-btn border border-charcoal/10 p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-charcoal truncate">{b.name}</p>
                      <p className="text-xs text-charcoal-muted truncate">{b.location}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={b.assigned ? "Assigned" : "Unassigned"} />
                      <Button size="sm" variant={b.assigned ? "secondary" : "primary"} onClick={() => toggle(b)} disabled={!!busy} isLoading={saving}>
                        {b.assigned ? "Unassign" : "Assign"}
                      </Button>
                    </div>
                  </div>
                  {!b.assigned && (
                    <p className="text-xs text-charcoal-muted">Hidden from this branch's cashier. Its stock and history are preserved and return on re-assignment.</p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-charcoal-muted">Effective</span>
                    <span className="font-semibold text-charcoal">{inr(b.effectivePrice)}</span>
                    <PriceSourceTag overridden={b.priceOverride != null} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        id={`price-override-${b.shopId}`} label="Branch price override (₹)" type="number" min={0} step="0.01"
                        value={drafts[b.shopId] ?? ""} placeholder={`Common: ${data.sellingPrice}`}
                        hint={b.priceOverride != null ? `Override ${inr(b.priceOverride)} replaces the common price ${inr(data.sellingPrice)}.` : `Blank = inherit the common price ${inr(data.sellingPrice)}.`}
                        onChange={(e) => setDrafts((d) => ({ ...d, [b.shopId]: e.target.value }))}
                      />
                    </div>
                    <Button size="sm" onClick={() => savePrice(b)} disabled={!!busy || isUnchanged(b)}>Save</Button>
                    {b.priceOverride != null && (
                      <Button size="sm" variant="secondary" onClick={() => setPendingReset(b)} disabled={!!busy}>Reset to common price</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      <ConfirmModal
        isOpen={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={confirmReset}
        title={`Reset ${pendingReset?.name ?? "this branch"} to the common price?`}
        description={
          pendingReset && data
            ? `${pendingReset.name} currently sells "${product?.name}" at ${inr(pendingReset.priceOverride ?? pendingReset.effectivePrice)} (branch override). After resetting, it reverts to the common product price of ${inr(data.sellingPrice)}. Completed bills are not changed.`
            : ""
        }
        confirmLabel="Reset price"
        isDangerous
      />

      <ConfirmModal
        isOpen={!!pendingUnassign}
        onClose={() => setPendingUnassign(null)}
        onConfirm={confirmUnassign}
        title={`Unassign from ${pendingUnassign?.name ?? "this branch"}?`}
        description={`"${product?.name ?? "This product"}" will be hidden from ${pendingUnassign?.name ?? "this branch"}'s cashier. Its stock and history are kept, and re-assigning restores it exactly as it was.`}
        confirmLabel="Unassign"
        isDangerous
      />
    </>
  );
}
