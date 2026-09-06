import { useEffect, useState } from "react";
import { Drawer, Button, Input } from "../ui";
import type { Customer, CustomerFormValues } from "../../types";

const emptyForm: CustomerFormValues = { name: "", phone: "" };

interface CustomerFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  customer?: Customer | null;
}

export function CustomerFormDrawer({ isOpen, onClose, onSubmit, customer }: CustomerFormDrawerProps) {
  const [values, setValues] = useState<CustomerFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValues(customer ? { name: customer.name, phone: customer.phone } : emptyForm);
      setErrors({});
    }
  }, [isOpen, customer]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Customer name is required.";
    if (!values.phone.trim()) next.phone = "Phone number is required.";
    else if (!/^[0-9+\-\s]{7,15}$/.test(values.phone.trim())) next.phone = "Enter a valid phone number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? "Edit Customer" : "Add Customer"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>{customer ? "Save changes" : "Add customer"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name" required value={values.name} error={errors.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Ravi Kumar"
        />
        <Input
          label="Phone number" required value={values.phone} error={errors.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          placeholder="e.g. 9876543210"
        />
      </form>
    </Drawer>
  );
}
