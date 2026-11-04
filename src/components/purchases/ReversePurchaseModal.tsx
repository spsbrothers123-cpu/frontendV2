import { useRef, useState } from "react";
import { Button, Textarea } from "../ui";
import { PurchaseModalShell } from "./PurchaseModalShell";
import { validateReversalReason, REVERSAL_REASON_MAX } from "./purchaseRules";
import { useStockCashier } from "../../hooks/useStockCashier";
import * as purchasesApi from "../../api/purchases";
import type { Purchase } from "../../types";

interface Props {
  purchase: Purchase;
  onClose: () => void;
  /** Called with the server's updated purchase (now carrying its reversal). */
  onReversed: (updated: Purchase) => void;
  /** Called when the backend says it was already reversed, so the list can refresh. */
  onAlreadyReversed: () => void;
}

type Failure =
  | { kind: "blocked"; message: string }
  | { kind: "already"; message: string }
  | { kind: "other"; message: string };

/**
 * Stage 3.4 — the controlled way to correct a completed purchase
 * (POST /admin/purchases/:id/reverse). The original purchase is never edited;
 * the backend records a linked reversal and takes the received quantities back
 * out of the purchase's OWN receiving branch, in one transaction.
 *
 * Both 409 outcomes are handled explicitly:
 *   PURCHASE_REVERSAL_BLOCKED  — stock would go negative / product unassigned;
 *                                nothing was written, the Admin can fix and retry.
 *   PURCHASE_ALREADY_REVERSED  — a reversal already exists; no retry possible.
 */
export function ReversePurchaseModal({ purchase, onClose, onReversed, onAlreadyReversed }: Props) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const inFlight = useRef(false); // blocks a double click before React re-renders

  // The RECEIVING branch's single cashier is actor metadata (the backend
  // requires it only before the BranchInventory cutover).
  const sc = useStockCashier(true, purchase.receivingShopId ?? null);
  const branch = purchase.receivingBranchName ?? "its receiving branch";
  const alreadyReversed = failure?.kind === "already";

  async function submit() {
    if (inFlight.current || alreadyReversed) return;
    const problem = validateReversalReason(reason);
    if (problem) { setReasonError(problem); return; }
    setReasonError(undefined);
    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      const updated = await purchasesApi.reversePurchase(purchase.id, reason.trim(), sc.cashierId || undefined);
      onReversed(updated);
    } catch (err: any) {
      if (err?.code === "PURCHASE_REVERSAL_BLOCKED") {
        setFailure({ kind: "blocked", message: err.message });
      } else if (err?.code === "PURCHASE_ALREADY_REVERSED") {
        setFailure({ kind: "already", message: err.message || "This purchase has already been reversed." });
        onAlreadyReversed();
      } else {
        setFailure({ kind: "other", message: err?.message || "Couldn't reverse the purchase." });
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <PurchaseModalShell
      title={`Reverse purchase ${purchase.invoiceNumber}`}
      onClose={onClose}
      busy={submitting}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>{alreadyReversed ? "Close" : "Cancel"}</Button>
          {!alreadyReversed && (
            <Button variant="danger" size="sm" onClick={submit} isLoading={submitting}>Reverse purchase</Button>
          )}
        </>
      }
    >
      <p>
        This takes the received quantities back out of <strong>{branch}</strong>'s stock. The original purchase and its
        history are kept, and a purchase can be reversed only once.
      </p>
      <Textarea
        label="Reason for reversal"
        required
        value={reason}
        maxLength={REVERSAL_REASON_MAX}
        error={reasonError}
        onChange={(e) => { setReason(e.target.value); if (reasonError) setReasonError(undefined); }}
        placeholder="e.g. Supplier invoice entered twice"
        disabled={alreadyReversed}
      />
      {sc.error && <p role="alert" className="text-sm text-danger">{sc.error}</p>}
      {failure?.kind === "blocked" && (
        <div role="alert" className="rounded-btn bg-danger-soft text-danger p-3 space-y-1">
          <p className="font-semibold">Reversal blocked — nothing was changed.</p>
          <p>{failure.message}</p>
          <p className="text-xs">Correct the branch's stock or re-assign the product there, then try again.</p>
        </div>
      )}
      {failure?.kind === "already" && (
        <div role="alert" className="rounded-btn bg-amber-soft text-amber p-3 space-y-1">
          <p className="font-semibold">Already reversed.</p>
          <p>{failure.message}</p>
          <p className="text-xs">The purchase list has been refreshed to show the reversal.</p>
        </div>
      )}
      {failure?.kind === "other" && <p role="alert" className="text-sm text-danger">{failure.message}</p>}
    </PurchaseModalShell>
  );
}
