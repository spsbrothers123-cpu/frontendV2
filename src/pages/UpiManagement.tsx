import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { ErrorState, Skeleton } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { CommonUpiCard } from "../components/upi/CommonUpiCard";
import { BranchUpiTable } from "../components/upi/BranchUpiTable";
import { BranchUpiDrawer } from "../components/upi/BranchUpiDrawer";
import { fetchUpiOverview, saveBranchUpi, saveCommonUpi } from "../api/upiApi";
import type { BranchUpi, BranchUpiValues, CommonUpiValues, UpiOverview } from "../types/upi";

// ─────────────────────────────────────────────────────────────────────────
// UPI Management is an Admin-level module. It lists every branch the backend
// returns for this admin, regardless of the globally selected shop. It never
// imports ShopContext, never calls setSelectedShop / switchShop, and stores
// nothing in localStorage / sessionStorage. (AdminLayout also keeps this page
// mounted across global shop switches — see SHOP_INDEPENDENT_PATHS.)
// ─────────────────────────────────────────────────────────────────────────
export default function UpiManagement() {
  const { showToast } = useToast();
  const [overview, setOverview] = useState<UpiOverview | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [editing, setEditing] = useState<BranchUpi | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // `silent` refetches (after a save) keep the current screen instead of
  // flashing skeletons or discarding in-progress edits.
  const load = useCallback(
    async (silent = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (!silent) setState("loading");
      try {
        const data = await fetchUpiOverview(controller.signal);
        if (controller.signal.aborted) return;
        setOverview(data);
        setState("success");
      } catch (err: any) {
        if (controller.signal.aborted) return;
        if (silent) {
          showToast("Saved, but the latest UPI details couldn't be refreshed. Reload the page to confirm.", "info");
        } else {
          setErrorMessage(err?.message || "Couldn't load UPI configuration.");
          setState("error");
        }
      }
    },
    [showToast]
  );

  useEffect(() => {
    void load();
    return () => controllerRef.current?.abort();
  }, [load]);

  async function handleSaveCommon(values: CommonUpiValues) {
    await saveCommonUpi(values);
    showToast("Common UPI account saved.", "success");
    await load(true);
  }

  async function handleSaveBranch(shopId: string, values: BranchUpiValues) {
    const name = overview?.branches.find((b) => b.shopId === shopId)?.shopName ?? "Branch";
    await saveBranchUpi(shopId, values);
    showToast(`${name} UPI configuration saved.`, "success");
    await load(true);
  }

  const branches = useMemo(() => overview?.branches ?? [], [overview]);
  const noReceiverCount = useMemo(() => branches.filter((b) => b.effective.source === "NONE").length, [branches]);
  const onCommonCount = useMemo(() => branches.filter((b) => b.effective.source === "COMMON").length, [branches]);

  return (
    <div>
      <PageHeader
        title="UPI Management"
        subtitle="Receiving UPI accounts for your business and every branch. Shown for all branches, whichever shop is selected above."
      />

      {state === "loading" && (
        <div className="space-y-5" role="status" aria-label="Loading UPI configuration">
          <div className="rounded-card bg-white shadow-soft p-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="rounded-card bg-white shadow-soft p-5 space-y-3">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-card bg-white shadow-soft">
          <ErrorState message={errorMessage} onRetry={() => void load()} />
        </div>
      )}

      {state === "success" && overview && (
        <div className="space-y-5">
          {noReceiverCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-btn bg-amber-soft text-amber text-sm px-4 py-3" role="alert">
              <AlertTriangle size={17} className="shrink-0 mt-0.5" />
              <p>
                {noReceiverCount} {noReceiverCount === 1 ? "branch has" : "branches have"} no receiving account. The Cashier
                Portal can’t generate a UPI QR there until one is configured.
              </p>
            </div>
          )}

          <CommonUpiCard common={overview.common} affectedBranchCount={onCommonCount} onSave={handleSaveCommon} />

          <section className="rounded-card bg-white shadow-soft p-4 sm:p-5" aria-labelledby="branch-upi-heading">
            <h2 id="branch-upi-heading" className="font-display font-bold text-lg text-charcoal mb-1">Branch Configurations</h2>
            <p className="text-sm text-charcoal-muted mb-4">
              Each branch uses the common account or its own custom account. The effective receiver is what the Cashier
              Portal will use.
            </p>
            <BranchUpiTable branches={branches} common={overview.common} onEdit={setEditing} />
          </section>
        </div>
      )}

      <BranchUpiDrawer
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        branch={editing}
        common={overview?.common ?? null}
        onSubmit={handleSaveBranch}
      />
    </div>
  );
}
