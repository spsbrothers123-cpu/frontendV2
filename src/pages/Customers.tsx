import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Users, Download } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, SearchBar, FilterBar, DataTable, Pagination, EmptyState, ErrorState } from "../components/ui";
import type { Column } from "../components/ui/DataTable";
import { CustomerFormDrawer } from "../components/customers/CustomerFormDrawer";
import { CustomerDetailsDrawer } from "../components/customers/CustomerDetailsDrawer";
import * as customersApi from "../api/customers";
import type { Customer, CustomerFormValues } from "../types";
import { useToast } from "../context/ToastContext";

const PAGE_SIZE = 8;

export default function Customers() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await customersApi.fetchCustomers({ search, page, pageSize: PAGE_SIZE });
      setCustomers(res.items);
      setTotal(res.total);
      setState("success");
    } catch {
      setState("error");
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  async function handleCreateOrUpdate(values: CustomerFormValues) {
    try {
      if (editingCustomer) {
        await customersApi.updateCustomer(editingCustomer.id, values);
        showToast("Customer updated.");
      } else {
        await customersApi.createCustomer(values);
        showToast("Customer added.");
      }
      load();
    } catch (err: any) {
      showToast(err?.message || "Couldn't save the customer.", "error");
      throw err;
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await customersApi.exportCustomers({ search });
      showToast("Export downloaded.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't export customers.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  const columns: Column<Customer>[] = [
    { key: "name", header: "Name", isPrimary: true, render: (c) => <span className="font-medium text-charcoal">{c.name}</span> },
    { key: "phone", header: "Phone", render: (c) => <span className="text-charcoal-muted">{c.phone}</span> },
    { key: "total", header: "Total Purchases", render: (c) => <span>₹{c.totalPurchases.toLocaleString("en-IN")}</span> },
    { key: "bills", header: "Bills", render: (c) => <span>{c.billCount}</span> },
    {
      key: "credit", header: "Credit Balance",
      render: (c) => (
        <span className={c.creditBalance > 0 ? "text-danger font-semibold" : "text-charcoal-muted"}>
          ₹{c.creditBalance.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Track purchase history and credit balances."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
              <Download size={16} /> {isExporting ? "Exporting…" : "Export"}
            </Button>
            <Button onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
              <Plus size={16} /> Add Customer
            </Button>
          </div>
        }
      />

      <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
        <FilterBar>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone..." />
        </FilterBar>

        <div className="mt-4">
          {state === "error" && <ErrorState message="Couldn't load customers." onRetry={load} />}
          {state === "success" && customers.length === 0 && (
            <EmptyState
              icon={<Users size={22} />}
              title="No customers found"
              description={search ? "Try a different search." : "Add your first customer to get started."}
              action={<Button size="sm" onClick={() => setFormOpen(true)}><Plus size={15} /> Add Customer</Button>}
            />
          )}
          {(state === "loading" || customers.length > 0) && (
            <DataTable
              columns={columns}
              rows={customers}
              rowKey={(c) => c.id}
              isLoading={state === "loading"}
              onRowClick={(c) => setViewingCustomer(c)}
              actionsRender={(c) => (
                <button
                  onClick={() => { setEditingCustomer(c); setFormOpen(true); }}
                  aria-label={`Edit ${c.name}`}
                  className="w-8 h-8 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"
                >
                  <Pencil size={15} />
                </button>
              )}
            />
          )}
        </div>

        {state === "success" && customers.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </div>

      <CustomerFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
        customer={editingCustomer}
      />

      <CustomerDetailsDrawer customer={viewingCustomer} onClose={() => setViewingCustomer(null)} />
    </div>
  );
}
