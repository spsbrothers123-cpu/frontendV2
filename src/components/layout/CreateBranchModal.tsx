import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input } from "../ui";
import * as shopsApi from "../../api/shops";
import { useShop } from "../../context/ShopContext";
import { useToast } from "../../context/ToastContext";

/**
 * Phase 2 Stage 2.8 — explicit Central Admin "Create Branch". The only way a
 * branch exists (Cashier signup now picks from this list). Creating a branch
 * does not switch the admin's selected branch. The backend assigns every
 * existing product to it at zero stock and enforces Central-Admin-only.
 */
export function CreateBranchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { refreshShops } = useShop();
  const { showToast } = useToast();
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (isOpen) { setLocation(""); setError(null); } }, [isOpen]);
  if (!isOpen) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const value = location.trim();
    if (!value) return setError("Enter the branch location.");
    setSubmitting(true);
    setError(null);
    try {
      const shop = await shopsApi.createBranch(value);
      showToast(`Branch "${shop.name}" created.`);
      await refreshShops();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn't create the branch.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create branch">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} aria-hidden="true" />
      <form onSubmit={submit} noValidate className="relative w-full max-w-sm bg-ivory-card rounded-card shadow-lift p-6">
        <h3 className="font-display font-bold text-lg text-charcoal mb-1">Create Branch</h3>
        <p className="text-sm text-charcoal-muted mb-5">
          Every existing product is assigned to the new branch automatically, starting at zero stock.
          A cashier can then sign up by selecting it.
        </p>
        <Input label="Branch location" required value={location} error={error ?? undefined} autoFocus
          placeholder="e.g. Bengaluru Central" onChange={(e) => { setLocation(e.target.value); setError(null); }} />
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={submitting}>Create branch</Button>
        </div>
      </form>
    </div>,
    document.body
  );
}
