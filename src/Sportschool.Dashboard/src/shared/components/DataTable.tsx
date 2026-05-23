import type { ReactNode } from "react";

type DataTableProps<TItem> = {
  items: TItem[];
  emptyText: string;
  columns: Array<{
    key: string;
    header: string;
    render: (item: TItem) => ReactNode;
  }>;
};

export function DataTable<TItem>({ items, columns, emptyText }: DataTableProps<TItem>) {
  if (items.length === 0) {
    return <div style={{ padding: 20, color: "var(--text-muted)" }}>{emptyText}</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
