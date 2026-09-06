import { useEffect, useState } from "react";
import { Drawer, Button, Select, Input, Textarea } from "../ui";
import * as creditsApi from "../../api/credits";
import type { CustomerCredit, PaymentCollectionFormValues, PaymentMethod } from "../../types";

const METHODS: PaymentMethod[] = ["Cash", "UPI", "Card", "Other"];

export function PaymentCollectionModal({
  credit,
  onClose,
  onCollected,
}: {
  credit: CustomerCredit | null;
  onClose: () => void;
  onCollected: () => void;
}) {
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credit) {
      setAmount(credit.pending);
      setMethod("Cash");
      setReference("");
      setNotes("");
      setError(null);
    }
  }, [credit]);

  if (!credit) return null;

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (!amount || Number(amount) <= 0) {
      setError("Enter a collection amount greater than zero.");
      return;
    }
    setSubmitting(true);
    const values: PaymentCollectionFormValues = { amount, method, reference, notes };
    try {
      await creditsApi.collectPayment(credit!.customerId, values);
      onCollected();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Payment collection isn't connected to the backend yet.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={!!credit}
      onClose={onClose}
      title="Collect Payment"
      subtitle={credit.customerName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>Record Payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-btn bg-ivory-soft p-4 flex items-center justify-between">
          <span className="text-sm text-charcoal-muted">Outstanding Amount</span>
          <span className="font-display font-bold text-danger">₹{credit.pending.toLocaleString("en-IN")}</span>
        </div>

        <Input
          label="Collection Amount"
          type="number"
          min={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <Select
          label="Payment Method"
          required
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          options={METHODS.map((m) => ({ label: m, value: m }))}
        />
        <Input label="Reference" hint="Optional — transaction ID or receipt number." value={reference} onChange={(e) => setReference(e.target.value)} />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">{error}</p>}
        <p className="text-xs text-charcoal-muted">Payment collection isn't connected to the backend yet — recording will show as disabled until that endpoint is confirmed.</p>
      </div>
    </Drawer>
  );
}
