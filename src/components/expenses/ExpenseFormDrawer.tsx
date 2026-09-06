import { useEffect, useState } from "react";
import { Drawer, Button, Input, Textarea } from "../ui";
import type { Expense, ExpenseFormValues } from "../../types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: ExpenseFormValues = { date: today(), category: "", description: "", amount: "" };

interface ExpenseFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  expense?: Expense | null;
  categories: string[];
}

export function ExpenseFormDrawer({ isOpen, onClose, onSubmit, expense, categories }: ExpenseFormDrawerProps) {
  const [values, setValues] = useState<ExpenseFormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValues(
        expense
          ? { date: expense.date, category: expense.category, description: expense.description, amount: expense.amount }
          : emptyForm
      );
      setErrors({});
    }
  }, [isOpen, expense]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.date) next.date = "Date is required.";
    if (!values.category.trim()) next.category = "Category is required.";
    if (!values.description.trim()) next.description = "Description is required.";
    if (values.amount === "" || Number(values.amount) <= 0) next.amount = "Enter a valid amount.";
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
      title={expense ? "Edit Expense" : "Add Expense"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>{expense ? "Save changes" : "Add expense"}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Date" required type="date" value={values.date} error={errors.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
        />
        <Input
          label="Category" required value={values.category} error={errors.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          placeholder="e.g. Transport, Utilities"
          list="expense-category-suggestions"
        />
        <datalist id="expense-category-suggestions">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
        <Textarea
          label="Description" required value={values.description} error={errors.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="What was this expense for?"
        />
        <Input
          label="Amount (₹)" required type="number" min={0} step="0.01" value={values.amount} error={errors.amount}
          onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value === "" ? "" : Number(e.target.value) }))}
        />
      </form>
    </Drawer>
  );
}
