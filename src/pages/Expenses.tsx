import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Receipt, Download } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, SearchBar, FilterBar, Select, DataTable, Pagination, EmptyState, ErrorState, CardSkeleton } from "../components/ui";
import { ConfirmModal } from "../components/ui/Overlay";
import type { Column } from "../components/ui/DataTable";
import { ExpenseFormDrawer } from "../components/expenses/ExpenseFormDrawer";
import * as expensesApi from "../api/expenses";
import type { Expense, ExpenseFormValues } from "../types";
import { useToast } from "../context/ToastContext";

const PAGE_SIZE = 8;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }

export default function Expenses() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [categories, setCategories] = useState<string[]>([]);

  const [summary, setSummary] = useState<{ today: number; month: number; total: number } | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "success" | "error">("loading");

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await expensesApi.fetchExpenses({ search, category, page, pageSize: PAGE_SIZE });
      setExpenses(res.items);
      setTotal(res.total);
      setCategories(expensesApi.getExpenseCategories());
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, category, page]);

  const loadSummary = useCallback(async () => {
    setSummaryState("loading");
    try {
      const [todayRes, monthRes, allRes] = await Promise.all([
        expensesApi.fetchExpenses({ dateFrom: todayStr(), pageSize: 1000 }),
        expensesApi.fetchExpenses({ dateFrom: monthStart(), pageSize: 1000 }),
        expensesApi.fetchExpenses({ pageSize: 1000 }),
      ]);
      setSummary({
        today: todayRes.items.reduce((s, e) => s + e.amount, 0),
        month: monthRes.items.reduce((s, e) => s + e.amount, 0),
        total: allRes.items.reduce((s, e) => s + e.amount, 0),
      });
      setSummaryState("success");
    } catch {
      setSummaryState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { setPage(1); }, [search, category]);

  async function handleCreateOrUpdate(values: ExpenseFormValues) {
    try {
      if (editingExpense) {
        await expensesApi.updateExpense(editingExpense.id, values);
        showToast("Expense updated.");
      } else {
        await expensesApi.createExpense(values);
        showToast("Expense added.");
      }
      load();
      loadSummary();
    } catch (err: any) {
      showToast(err?.message || "Couldn't save the expense.", "error");
      throw err;
    }
  }

  async function handleDelete() {
    if (!deletingExpense) return;
    setDeleteSubmitting(true);
    try {
      await expensesApi.deleteExpense(deletingExpense.id);
      showToast("Expense deleted.");
      setDeletingExpense(null);
      load();
      loadSummary();
    } catch (err: any) {
      showToast(err?.message || "Couldn't delete the expense.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await expensesApi.exportExpenses({ search, category });
      showToast("Export downloaded.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't export expenses.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  const columns: Column<Expense>[] = [
    { key: "date", header: "Date", isPrimary: true, render: (e) => <span className="font-medium text-charcoal">{e.date}</span> },
    { key: "category", header: "Category", render: (e) => <span className="text-charcoal-muted">{e.category}</span> },
    { key: "description", header: "Description", render: (e) => <span className="truncate block max-w-[220px]">{e.description}</span> },
    { key: "amount", header: "Amount", render: (e) => <span className="font-semibold">₹{e.amount.toLocaleString("en-IN")}</span> },
    { key: "createdBy", header: "Created By", render: (e) => <span className="text-charcoal-muted">{e.createdBy}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Log and track your shop's operating expenses."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
              <Download size={16} /> {isExporting ? "Exporting…" : "Export"}
            </Button>
            <Button onClick={() => { setEditingExpense(null); setFormOpen(true); }}>
              <Plus size={16} /> Add Expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summaryState === "loading" && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        {summaryState === "success" && summary && (
          <>
            <div className="rounded-card bg-white shadow-soft p-5">
              <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide mb-2">Today's Expenses</p>
              <p className="font-display font-extrabold text-2xl text-charcoal">₹{summary.today.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-card bg-white shadow-soft p-5">
              <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide mb-2">This Month</p>
              <p className="font-display font-extrabold text-2xl text-charcoal">₹{summary.month.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-card bg-white shadow-soft p-5">
              <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide mb-2">Total Expenses</p>
              <p className="font-display font-extrabold text-2xl text-charcoal">₹{summary.total.toLocaleString("en-IN")}</p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." />
          <Select
            value={category} onChange={(e) => setCategory(e.target.value)}
            options={[{ label: "All categories", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))]}
            className="w-auto min-w-[150px]"
          />
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load expenses." onRetry={load} />}
          {state === "success" && expenses.length === 0 && (
            <EmptyState
              icon={<Receipt size={22} />}
              title="No expenses recorded"
              description={search || category !== "all" ? "Try adjusting your filters." : "Add your first expense to start tracking."}
              action={<Button size="sm" onClick={() => setFormOpen(true)}><Plus size={15} /> Add Expense</Button>}
            />
          )}
          {(state === "loading" || expenses.length > 0) && (
            <DataTable
              columns={columns}
              rows={expenses}
              rowKey={(e) => e.id}
              isLoading={state === "loading"}
              actionsRender={(e) => (
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => { setEditingExpense(e); setFormOpen(true); }} aria-label={`Edit expense on ${e.date}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"><Pencil size={15} /></button>
                  <button onClick={() => setDeletingExpense(e)} aria-label={`Delete expense on ${e.date}`} className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-danger-soft hover:text-danger transition-colors duration-150"><Trash2 size={15} /></button>
                </div>
              )}
            />
          )}
        </div>

        {state === "success" && expenses.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      <ExpenseFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
        expense={editingExpense}
        categories={categories}
      />

      <ConfirmModal
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDelete}
        title="Delete this expense?"
        description="This action can't be undone."
        confirmLabel="Delete"
        isDangerous
        isLoading={deleteSubmitting}
      />
    </div>
  );
}
