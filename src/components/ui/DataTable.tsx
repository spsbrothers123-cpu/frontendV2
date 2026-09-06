import type { ReactNode } from "react";
import { TableSkeleton } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  // Shown as the prominent line in mobile card mode (usually name/id)
  isPrimary?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  actionsRender?: (row: T) => ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, onRowClick, actionsRender }: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div>
        {/* desktop skeleton */}
        <div className="hidden md:block"><TableSkeleton cols={columns.length} /></div>
        {/* mobile skeleton */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card bg-white p-4 shadow-soft animate-pulse space-y-2">
              <div className="h-4 w-1/2 bg-charcoal/8 rounded" />
              <div className="h-3 w-1/3 bg-charcoal/8 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const primaryCol = columns.find((c) => c.isPrimary) ?? columns[0];
  const restCols = columns.filter((c) => c.key !== primaryCol.key);

  return (
    <div>
      {/* Desktop / tablet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal/8">
              {columns.map((col) => (
                <th key={col.key} className={`text-left font-semibold text-charcoal-muted text-xs uppercase tracking-wide py-3 px-3 ${col.className ?? ""}`}>
                  {col.header}
                </th>
              ))}
              {actionsRender && <th className="py-3 px-3 text-right text-xs font-semibold text-charcoal-muted uppercase tracking-wide">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-charcoal/6 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-yolk-50/60" : ""} transition-colors duration-150`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3.5 px-3 align-middle ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
                {actionsRender && (
                  <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {actionsRender(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card mode */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={`rounded-card bg-white p-4 shadow-soft ${onRowClick ? "cursor-pointer active:scale-[0.99]" : ""} transition-transform duration-150`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-charcoal text-sm">{primaryCol.render(row)}</div>
              {actionsRender && <div onClick={(e) => e.stopPropagation()}>{actionsRender(row)}</div>}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {restCols.map((col) => (
                <div key={col.key} className="min-w-0">
                  <dt className="text-[11px] text-charcoal-muted uppercase tracking-wide">{col.header}</dt>
                  <dd className="text-sm text-charcoal truncate">{col.render(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
