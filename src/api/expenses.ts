import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId } from "./mockStore";
import { downloadBlob, extensionForFormat } from "../lib/download";
import type { Expense, ExpenseFormValues, Paginated, ExportFormat } from "../types";

export interface ExpenseQuery {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

// NOTE for backend integration: expects GET /admin/expenses
export async function fetchExpenses(query: ExpenseQuery): Promise<Paginated<Expense>> {
  if (USE_MOCK) {
    let items = [...store.expenses];
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((e) => e.description.toLowerCase().includes(s) || e.category.toLowerCase().includes(s));
    }
    if (query.category && query.category !== "all") items = items.filter((e) => e.category === query.category);
    if (query.dateFrom) items = items.filter((e) => e.date >= query.dateFrom!);
    if (query.dateTo) items = items.filter((e) => e.date <= query.dateTo!);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<Expense>>("/admin/expenses", { params: query });
  return data;
}

// NOTE for backend integration: expects POST /admin/expenses
export async function createExpense(values: ExpenseFormValues): Promise<Expense> {
  if (USE_MOCK) {
    const expense: Expense = {
      id: genId("e"),
      date: values.date,
      category: values.category,
      description: values.description,
      amount: Number(values.amount),
      createdBy: "Admin",
    };
    store.expenses = [expense, ...store.expenses];
    return delay(expense, 450);
  }
  const { data } = await apiClient.post<Expense>("/admin/expenses", values);
  return data;
}

// NOTE for backend integration: expects PUT /admin/expenses/:id
export async function updateExpense(id: string, values: ExpenseFormValues): Promise<Expense> {
  if (USE_MOCK) {
    let updated: Expense | undefined;
    store.expenses = store.expenses.map((e) => {
      if (e.id !== id) return e;
      updated = { ...e, date: values.date, category: values.category, description: values.description, amount: Number(values.amount) };
      return updated;
    });
    if (!updated) return Promise.reject({ status: 404, message: "Expense not found." });
    return delay(updated, 450);
  }
  const { data } = await apiClient.put<Expense>(`/admin/expenses/${id}`, values);
  return data;
}

// NOTE for backend integration: expects DELETE /admin/expenses/:id
export async function deleteExpense(id: string): Promise<void> {
  if (USE_MOCK) {
    store.expenses = store.expenses.filter((e) => e.id !== id);
    return delay(undefined, 400);
  }
  await apiClient.delete(`/admin/expenses/${id}`);
}

export function getExpenseCategories(): string[] {
  return Array.from(new Set(store.expenses.map((e) => e.category))).concat(["Transport", "Utilities", "Supplies", "Rent", "Salaries", "Other"]).filter((v, i, a) => a.indexOf(v) === i);
}

// NOTE for backend integration: expects GET /admin/expenses/export (format=excel|csv)
// Downloads real backend-generated data — never fabricates a file client-side.
export async function exportExpenses(query: Omit<ExpenseQuery, "page" | "pageSize">, format: ExportFormat = "excel"): Promise<void> {
  if (USE_MOCK) {
    throw { status: 501, message: "Export requires the live backend — turn off demo mode to use it." };
  }
  const response = await apiClient.get("/admin/expenses/export", {
    params: { ...query, format },
    responseType: "blob",
  });
  downloadBlob(response.data, response.headers, `Expenses.${extensionForFormat(format)}`);
}
