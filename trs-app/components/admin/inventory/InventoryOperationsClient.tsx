"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  _id: string;
  status?: string;
  returnNumber?: string;
  transferNumber?: string;
  countNumber?: string;
  wasteNumber?: string;
  grandTotal?: number;
  totalCost?: number;
  createdAt?: string;
  returnDate?: string;
  countedAt?: string;
  occurredAt?: string;
};

type ApiResponse<T> = {
  data?: T;
  message?: string;
};

const endpoints = [
  {
    key: "returns",
    label: "Purchase Returns",
    url: "/api/v1/admin/purchases/returns",
  },
  {
    key: "transfers",
    label: "Stock Transfers",
    url: "/api/v1/admin/inventory/transfers",
  },
  {
    key: "counts",
    label: "Stock Counts",
    url: "/api/v1/admin/inventory/stock-counts",
  },
  {
    key: "wastage",
    label: "Wastage",
    url: "/api/v1/admin/inventory/wastage",
  },
] as const;

export default function InventoryOperationsClient() {
  const [active, setActive] =
    useState<(typeof endpoints)[number]>(endpoints[0]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(active.url, {
        cache: "no-store",
      });

      const payload = (await response.json()) as ApiResponse<Row[]>;

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load records.");
      }

      setRows(payload.data ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load records."
      );
    } finally {
      setLoading(false);
    }
  }, [active.url]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          Inventory Operations
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Purchase returns, warehouse transfers, physical counts and
          wastage.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {endpoints.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              active.key === item.key
                ? "bg-black text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">
            Loading…
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">
            No records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Amount / Cost</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const timestamp =
                    row.returnDate ??
                    row.countedAt ??
                    row.occurredAt ??
                    row.createdAt;

                  return (
                    <tr key={row._id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {row.returnNumber ??
                          row.transferNumber ??
                          row.countNumber ??
                          row.wasteNumber ??
                          row._id}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {row.status ?? "recorded"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        ₹{(row.grandTotal ?? row.totalCost ?? 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {timestamp
                          ? new Date(timestamp).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}