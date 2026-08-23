"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ApiEnvelope<T> = {
  data: T;
  message?: string;
  error?: string;
};

type ForecastRun = {
  id: string;
  lookbackDays: number;
  horizonDays: number;
  itemCount: number;
  highRiskCount: number;
  recommendedOrderValue: number;
  durationMs: number;
  completedAt: string;
};

type SummaryPayload = {
  run: ForecastRun | null;
  summary: {
    itemCount: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recommendedOrderQuantity: number;
    recommendedOrderValue: number;
    averageConfidence: number;
    stockoutWithin7Days: number;
    fastMoving: number;
  };
  categories: Array<{
    _id: string;
    items: number;
    recommendedOrderValue: number;
    forecastMonthlyDemand: number;
  }>;
};

type ForecastItem = {
  _id: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  forecastDailyDemand: number;
  forecastMonthlyDemand: number;
  trendPercent: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  recommendedOrderValue: number;
  daysUntilStockout: number | null;
  confidenceScore: number;
  riskLevel: string;
  velocityClass: string;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  return typeof payload === "object" &&
    payload !== null &&
    "data" in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T);
}

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(
      payload.message ??
        payload.error ??
        "Request failed.",
    );
  }

  return unwrap(payload);
}

export function InventoryForecastDashboardClient({
  canManage,
  canExport,
}: {
  canManage: boolean;
  canExport: boolean;
}) {
  const [summary, setSummary] =
    useState<SummaryPayload | null>(null);
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [risk, setRisk] = useState("");
  const [search, setSearch] = useState("");
  const [lookbackDays, setLookbackDays] = useState(90);
  const [horizonDays, setHorizonDays] = useState(30);
  const [leadTimeDays, setLeadTimeDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        limit: "100",
        ...(risk ? { riskLevel: risk } : {}),
        ...(search.trim()
          ? { search: search.trim() }
          : {}),
      });

      const [summaryData, itemData] = await Promise.all([
        request<SummaryPayload>(
          "/api/v1/admin/inventory/forecast/summary",
        ),
        request<{ rows: ForecastItem[] }>(
          `/api/v1/admin/inventory/forecast/items?${query}`,
        ),
      ]);

      setSummary(summaryData);
      setItems(itemData.rows);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load forecasting dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [risk, search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void load(),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load]);

  const generate = async () => {
    setWorking(true);
    setError("");
    setNotice("");

    try {
      await request(
        "/api/v1/admin/inventory/forecast/run",
        {
          method: "POST",
          body: JSON.stringify({
            lookbackDays,
            horizonDays,
            leadTimeDays,
            serviceLevelFactor: 1.65,
            source: "manual",
          }),
        },
      );
      setNotice(
        "Forecast generated with updated reorder recommendations.",
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to generate forecast.",
      );
    } finally {
      setWorking(false);
    }
  };

  const cards = useMemo(
    () => [
      [
        "Forecasted items",
        String(summary?.summary.itemCount ?? 0),
      ],
      [
        "Critical / high risk",
        String(
          (summary?.summary.critical ?? 0) +
            (summary?.summary.high ?? 0),
        ),
      ],
      [
        "Stockout within 7 days",
        String(
          summary?.summary.stockoutWithin7Days ?? 0,
        ),
      ],
      [
        "Recommended purchase value",
        money.format(
          summary?.summary.recommendedOrderValue ?? 0,
        ),
      ],
      [
        "Average confidence",
        `${Number(
          summary?.summary.averageConfidence ?? 0,
        ).toFixed(1)}%`,
      ],
      [
        "Fast-moving items",
        String(summary?.summary.fastMoving ?? 0),
      ],
    ],
    [summary],
  );

  if (loading && !summary) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-8">
        Loading inventory forecasting…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-neutral-950 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
          Phase 6 intelligence
        </p>
        <div className="mt-2 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black">
              Inventory Demand Forecasting
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-300">
              Predict consumption, estimate stockout dates,
              calculate safety stock, and generate actionable
              purchase recommendations from actual movement data.
            </p>
          </div>

          {canManage ? (
            <div className="grid gap-2 sm:grid-cols-4">
              <label className="text-xs text-neutral-300">
                Lookback
                <select
                  value={lookbackDays}
                  onChange={(event) =>
                    setLookbackDays(
                      Number(event.target.value),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white"
                >
                  <option value={30} className="text-black">
                    30 days
                  </option>
                  <option value={60} className="text-black">
                    60 days
                  </option>
                  <option value={90} className="text-black">
                    90 days
                  </option>
                  <option value={180} className="text-black">
                    180 days
                  </option>
                </select>
              </label>

              <label className="text-xs text-neutral-300">
                Horizon
                <select
                  value={horizonDays}
                  onChange={(event) =>
                    setHorizonDays(
                      Number(event.target.value),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white"
                >
                  <option value={7} className="text-black">
                    7 days
                  </option>
                  <option value={14} className="text-black">
                    14 days
                  </option>
                  <option value={30} className="text-black">
                    30 days
                  </option>
                  <option value={60} className="text-black">
                    60 days
                  </option>
                </select>
              </label>

              <label className="text-xs text-neutral-300">
                Lead time
                <select
                  value={leadTimeDays}
                  onChange={(event) =>
                    setLeadTimeDays(
                      Number(event.target.value),
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white"
                >
                  <option value={3} className="text-black">
                    3 days
                  </option>
                  <option value={7} className="text-black">
                    7 days
                  </option>
                  <option value={14} className="text-black">
                    14 days
                  </option>
                  <option value={21} className="text-black">
                    21 days
                  </option>
                </select>
              </label>

              <button
                type="button"
                disabled={working}
                onClick={() => void generate()}
                className="self-end rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black hover:bg-red-500 disabled:opacity-50"
              >
                {working
                  ? "Generating…"
                  : "Generate forecast"}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {!summary?.run ? (
        <section className="rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h2 className="text-xl font-black">
            No forecast has been generated yet
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Generate the first forecast to calculate demand,
            safety stock, reorder points, and stockout risk.
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(([label, value]) => (
              <div
                key={label}
                className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-neutral-500">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-black text-neutral-950">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Forecast recommendations
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Last generated{" "}
                  {summary.run.completedAt
                    ? new Date(
                        summary.run.completedAt,
                      ).toLocaleString()
                    : "recently"}{" "}
                  using {summary.run.lookbackDays} days of
                  history.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search item or SKU"
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                />
                <select
                  value={risk}
                  onChange={(event) =>
                    setRisk(event.target.value)
                  }
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                >
                  <option value="">All risks</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-bold text-white"
                >
                  Apply
                </button>
                {canExport ? (
                  <>
                    <Link
                      href="/api/v1/admin/inventory/forecast/export/xlsx"
                      prefetch={false}
                      className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold"
                    >
                      Excel
                    </Link>
                    <Link
                      href="/api/v1/admin/inventory/forecast/export/pdf"
                      prefetch={false}
                      className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold"
                    >
                      PDF
                    </Link>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1180px] w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="py-3">Item</th>
                    <th>Risk</th>
                    <th>Velocity</th>
                    <th>Current</th>
                    <th>Daily demand</th>
                    <th>30-day demand</th>
                    <th>Trend</th>
                    <th>Safety stock</th>
                    <th>Reorder point</th>
                    <th>Order qty</th>
                    <th>Order value</th>
                    <th>Stockout</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b border-neutral-100"
                    >
                      <td className="py-3">
                        <p className="font-bold">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {item.sku} · {item.category}
                        </p>
                      </td>
                      <td className="font-bold capitalize">
                        {item.riskLevel}
                      </td>
                      <td className="capitalize">
                        {item.velocityClass}
                      </td>
                      <td>
                        {item.currentStock.toFixed(2)}{" "}
                        {item.unit}
                      </td>
                      <td>
                        {item.forecastDailyDemand.toFixed(
                          2,
                        )}
                      </td>
                      <td>
                        {item.forecastMonthlyDemand.toFixed(
                          2,
                        )}
                      </td>
                      <td>
                        {item.trendPercent >= 0 ? "+" : ""}
                        {item.trendPercent.toFixed(1)}%
                      </td>
                      <td>
                        {item.safetyStock.toFixed(2)}
                      </td>
                      <td>
                        {item.reorderPoint.toFixed(2)}
                      </td>
                      <td className="font-black">
                        {item.recommendedOrderQuantity.toFixed(
                          2,
                        )}
                      </td>
                      <td className="font-black">
                        {money.format(
                          item.recommendedOrderValue,
                        )}
                      </td>
                      <td>
                        {item.daysUntilStockout === null
                          ? "No demand"
                          : `${item.daysUntilStockout.toFixed(
                              1,
                            )} days`}
                      </td>
                      <td>
                        {item.confidenceScore.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  No forecast rows match the selected filters.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6">
            <h2 className="text-xl font-black">
              Category purchase exposure
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summary.categories.map((category) => (
                <div
                  key={category._id}
                  className="rounded-2xl bg-neutral-50 p-4"
                >
                  <p className="font-bold">
                    {category._id}
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {money.format(
                      category.recommendedOrderValue,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {category.items} items ·{" "}
                    {Number(
                      category.forecastMonthlyDemand,
                    ).toFixed(2)}{" "}
                    forecast units
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
