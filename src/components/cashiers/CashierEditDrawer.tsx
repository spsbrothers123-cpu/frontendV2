import { useEffect, useState } from "react";
import { Drawer, Button, Input } from "../ui";
import type { CashierAccount, CashierUpdateValues } from "../../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same intent as the backend's check — loose on purpose, this is a
// contact number an admin can jot down, not an OTP/SMS field.
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

interface CashierEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CashierUpdateValues) => Promise<void>;
  cashier: CashierAccount | null;
}

export function CashierEditDrawer({ isOpen, onClose, onSubmit, cashier }: CashierEditDrawerProps) {
  const [values, setValues] = useState<CashierUpdateValues>({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof CashierUpdateValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && cashier) {
      setValues({ name: cashier.name, email: cashier.email, phone: cashier.phone ?? "" });
      setErrors({});
      setFormError(null);
    }
  }, [isOpen, cashier]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!values.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (values.phone.trim() && !PHONE_RE.test(values.phone.trim())) next.phone = "Enter a valid phone number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // guard against duplicate submissions
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      // Keep the modal open on failure so the admin can correct and retry.
      setFormError(err?.message || "Couldn't save these changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Cashier"
      subtitle={cashier ? `Editing ${cashier.name}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>Save changes</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div className="rounded-btn bg-danger-soft text-danger text-sm px-3.5 py-2.5" role="alert">
            {formError}
          </div>
        )}

        <Input
          label="Full name" required value={values.name} error={errors.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Meena Devi"
        />
        <Input
          label="Email" required type="email" value={values.email} error={errors.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          placeholder="cashier@example.com"
        />
        <Input
          label="Phone number" value={values.phone} error={errors.phone} hint="Optional"
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          placeholder="e.g. 98765 00001"
        />

        {cashier?.shop && (
          <div className="rounded-btn bg-ivory-soft px-3.5 py-2.5">
            <p className="text-xs text-charcoal-muted uppercase tracking-wide mb-0.5">Shop</p>
            <p className="text-sm font-medium text-charcoal">{cashier.shop.name}</p>
          </div>
        )}
      </form>
    </Drawer>
  );
}
