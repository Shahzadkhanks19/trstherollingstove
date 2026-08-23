"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faChartLine,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard } from "@/components/admin/AdminPrimitives";

type SaleType =
  | "staff_meal"
  | "family_meal"
  | "complimentary"
  | "food_wastage"
  | "kitchen_test";

type Report = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    saleType: "all" | SaleType;
  };
  summary: {
    orders: number;
    menuValue: number;
    inventoryCost: number;
    items: number;
    uniquePeople: number;
    averageMenuValue: number;
    averageInventoryCost: number;
    averageItemsPerOrder: number;
    costCoveragePercent: number;
    approvedOrders: number;
    approvalRequiredOrders: number;
    approvalRatePercent: number;
  };
  comparison: {
    previousOrders: number;
    previousMenuValue: number;
    previousInventoryCost: number;
    ordersChangePercent: number;
    menuValueChangePercent: number;
    inventoryCostChangePercent: number;
  };
  dataQuality: {
    missingPersonOrders: number;
    missingReasonOrders: number;
    zeroCostOrders: number;
    completenessPercent: number;
  };
  daily: Array<{
    date: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
    items: number;
  }>;
  hourly: Array<{
    hour: number;
    label: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  weekdays: Array<{
    weekday: number;
    label: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  departments: Array<{
    department: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  designations: Array<{
    designation: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  saleTypes: Array<{
    saleType: SaleType;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  approvals: Array<{ status: string; orders: number; menuValue: number }>;
  topPeople: Array<{
    personName: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  topReasons: Array<{
    reason: string;
    orders: number;
    menuValue: number;
    inventoryCost: number;
  }>;
  topItems: Array<{
    itemName: string;
    quantity: number;
    orders: number;
    menuValue: number;
  }>;
  alerts: Array<{
    severity: "info" | "warning" | "critical";
    code: string;
    title: string;
    description: string;
  }>;
};

type ApiResponse = { data?: Report; message?: string };
type Preset = "today" | "7d" | "30d" | "month" | "custom";

const labels: Record<SaleType, string> = {
  staff_meal: "Staff meals",
  family_meal: "Family meals",
  complimentary: "Complimentary",
  food_wastage: "Food wastage",
  kitchen_test: "Kitchen testing",
};

function isoDate(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function presetDates(preset: Exclude<Preset, "custom">): {
  from: string;
  to: string;
} {
  const now = new Date();
  const start = new Date(now);
  if (preset === "today") return { from: isoDate(now), to: isoDate(now) };
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "month") start.setDate(1);
  return { from: isoDate(start), to: isoDate(now) };
}

function Change({ value }: { value: number }) {
  const prefix = value > 0 ? "+" : "";
  return (
    <span
      className={
        value > 0
          ? "text-red-600"
          : value < 0
            ? "text-emerald-700"
            : "text-slate-500"
      }
    >
      {prefix}
      {value}% vs previous period
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-[#173044]">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{detail}</p>
    </div>
  );
}

function Bars({
  rows,
}: {
  rows: Array<{ label: string; value: number; detail: string }>;
}) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#173044]">
                {row.label}
              </p>
              <p className="text-xs text-slate-500">{row.detail}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-[#C8102E]">
              {currency(row.value)}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#C8102E]"
              style={{
                width: `${max ? Math.max(2, (row.value / max) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
      {!rows.length ? (
        <p className="py-8 text-center text-sm font-bold text-slate-400">
          No data for this period.
        </p>
      ) : null}
    </div>
  );
}

function DailyTrend({ rows }: { rows: Report["daily"] }) {
  const max = Math.max(0, ...rows.map((row) => row.menuValue));
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[680px] items-end gap-2" style={{ height: 240 }}>
        {rows.map((row) => (
          <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-44 w-full items-end justify-center rounded-t-lg bg-slate-50 px-1">
              <div
                title={`${row.date}: ${currency(row.menuValue)}`}
                className="w-full max-w-8 rounded-t-md bg-[#C8102E] transition-[height]"
                style={{
                  height: `${max ? Math.max(3, (row.menuValue / max) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="mt-2 truncate text-[10px] font-bold text-slate-500">
              {row.date.slice(5)}
            </p>
          </div>
        ))}
      </div>
      {!rows.length ? (
        <p className="py-14 text-center text-sm font-bold text-slate-400">
          No daily trend data for this period.
        </p>
      ) : null}
    </div>
  );
}

export function InternalConsumptionExecutiveClient() {
  const initial = useMemo(() => presetDates("30d"), []);
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [saleType, setSaleType] = useState<"all" | SaleType>("all");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(
    () => new URLSearchParams({ from, to, saleType }).toString(),
    [from, to, saleType],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/admin/internal-consumption/executive?${query}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message ?? "Unable to load executive analytics.",
        );
      }
      setReport(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load executive analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  function applyPreset(nextPreset: Exclude<Preset, "custom">) {
    const range = presetDates(nextPreset);
    setPreset(nextPreset);
    setFrom(range.from);
    setTo(range.to);
  }

  const peakHours =
    report?.hourly
      .filter((row) => row.orders > 0)
      .sort((a, b) => b.menuValue - a.menuValue)
      .slice(0, 8) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive business intelligence"
        title="Internal Consumption Executive Dashboard"
        description="Management KPIs, comparable-period trends, inventory costs, approvals, data quality and operational exceptions for every zero-revenue order type."
        actions={
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />
            Refresh
          </button>
        }
      />

      <SectionCard>
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Date presets">
          {([
            ["today", "Today"],
            ["7d", "Last 7 days"],
            ["30d", "Last 30 days"],
            ["month", "This month"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyPreset(value)}
              className={`rounded-full border px-4 py-2 text-xs font-black ${preset === value ? "border-[#C8102E] bg-[#C8102E] text-white" : "border-slate-200 bg-white text-[#173044]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4 md:items-end">
          <label className="text-xs font-black text-[#173044]">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                setPreset("custom");
                setFrom(event.target.value);
              }}
              className="mt-2 h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-black text-[#173044]">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => {
                setPreset("custom");
                setTo(event.target.value);
              }}
              className="mt-2 h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-black text-[#173044]">
            Order type
            <select
              value={saleType}
              onChange={(event) =>
                setSaleType(event.target.value as "all" | SaleType)
              }
              className="mt-2 h-11 w-full rounded-xl border bg-white px-3"
            >
              <option value="all">All internal orders</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-50"
          >
            Apply filters
          </button>
        </div>
      </SectionCard>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <SectionCard>
          <p className="py-14 text-center font-bold text-slate-400">
            Loading executive analytics…
          </p>
        </SectionCard>
      ) : null}

      {!loading && report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Menu value consumed"
              value={currency(report.summary.menuValue)}
              detail={<Change value={report.comparison.menuValueChangePercent} />}
            />
            <MetricCard
              label="Inventory cost"
              value={currency(report.summary.inventoryCost)}
              detail={
                <>
                  <Change value={report.comparison.inventoryCostChangePercent} />
                  {" · "}
                  {report.summary.costCoveragePercent}% coverage
                </>
              }
            />
            <MetricCard
              label="Internal orders"
              value={String(report.summary.orders)}
              detail={
                <>
                  <Change value={report.comparison.ordersChangePercent} />
                  {" · "}
                  {report.summary.items} items
                </>
              }
            />
            <MetricCard
              label="Approval compliance"
              value={`${report.summary.approvalRatePercent}%`}
              detail={`${report.summary.approvedOrders} of ${report.summary.approvalRequiredOrders} approval-required orders`}
            />
            <MetricCard
              label="Average menu value"
              value={currency(report.summary.averageMenuValue)}
              detail={`${report.summary.averageItemsPerOrder} items per order`}
            />
            <MetricCard
              label="Average inventory cost"
              value={currency(report.summary.averageInventoryCost)}
              detail="Ingredient cost per internal order"
            />
            <MetricCard
              label="People served"
              value={String(report.summary.uniquePeople)}
              detail="Unique recorded people"
            />
            <MetricCard
              label="Data completeness"
              value={`${report.dataQuality.completenessPercent}%`}
              detail={`${report.dataQuality.zeroCostOrders} orders without inventory cost`}
            />
          </div>

          <SectionCard>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faChartLine} className="text-[#C8102E]" />
              <div>
                <h2 className="text-lg font-black text-[#173044]">
                  Daily consumption trend
                </h2>
                <p className="text-sm text-slate-500">
                  Menu value by day in India Standard Time.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <DailyTrend rows={report.daily} />
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="text-[#C8102E]"
              />
              <div>
                <h2 className="text-lg font-black text-[#173044]">
                  Executive exceptions
                </h2>
                <p className="text-sm text-slate-500">
                  Threshold and data-quality warnings generated for the selected
                  period.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {report.alerts.map((alert) => (
                <div
                  key={alert.code}
                  className={`rounded-2xl border p-4 ${alert.severity === "critical" ? "border-red-200 bg-red-50" : alert.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <p className="text-sm font-black text-[#173044]">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {alert.description}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">
                Consumption by order type
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Menu value and inventory cost by operational classification.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.saleTypes.map((row) => ({
                    label: labels[row.saleType],
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">Peak hours</h2>
              <p className="mt-1 text-sm text-slate-500">
                Highest internal-consumption periods in India Standard Time.
              </p>
              <div className="mt-5">
                <Bars
                  rows={peakHours.map((row) => ({
                    label: row.label,
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">Top people</h2>
              <p className="mt-1 text-sm text-slate-500">
                Highest recorded internal-consumption value.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.topPeople.map((row) => ({
                    label: row.personName,
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">Top reasons</h2>
              <p className="mt-1 text-sm text-slate-500">
                Reasons producing the highest menu value.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.topReasons.map((row) => ({
                    label: row.reason,
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">Top items</h2>
              <p className="mt-1 text-sm text-slate-500">
                Most consumed menu items by quantity.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.topItems.map((row) => ({
                    label: row.itemName,
                    value: row.menuValue,
                    detail: `${row.quantity} quantity · ${row.orders} orders`,
                  }))}
                />
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">
                Department analysis
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Staff meals attributed through the staff profile directory.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.departments.map((row) => ({
                    label: titleCase(row.department),
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">
                Designation analysis
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Consumption cost grouped by employee designation.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.designations.map((row) => ({
                    label: row.designation,
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">
                Weekday trend
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Identify recurring high-consumption days.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.weekdays.map((row) => ({
                    label: row.label,
                    value: row.menuValue,
                    detail: `${row.orders} orders · Cost ${currency(row.inventoryCost)}`,
                  }))}
                />
              </div>
            </SectionCard>
            <SectionCard>
              <h2 className="text-lg font-black text-[#173044]">
                Approval status
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Audit summary for approved, required and non-required orders.
              </p>
              <div className="mt-5">
                <Bars
                  rows={report.approvals.map((row) => ({
                    label: titleCase(row.status),
                    value: row.menuValue,
                    detail: `${row.orders} orders`,
                  }))}
                />
              </div>
            </SectionCard>
          </div>

          <SectionCard>
            <h2 className="text-lg font-black text-[#173044]">
              Reporting data quality
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Missing classifications reduce the reliability of financial and
              cost reporting.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Missing person"
                value={String(report.dataQuality.missingPersonOrders)}
                detail="Orders without a recorded person"
              />
              <MetricCard
                label="Missing reason"
                value={String(report.dataQuality.missingReasonOrders)}
                detail="Orders without a recorded reason"
              />
              <MetricCard
                label="Missing inventory cost"
                value={String(report.dataQuality.zeroCostOrders)}
                detail="Orders with no cost movement"
              />
            </div>
            <p className="mt-4 text-right text-xs font-bold text-slate-400">
              Generated {new Date(report.generatedAt).toLocaleString("en-IN")}
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
