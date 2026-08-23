"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faChartLine,
  faClock,
  faIndianRupeeSign,
  faReceipt,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/admin/AdminPrimitives";

type Data = {
  kpis: {
    orders: number;
    revenue: number;
    items: number;
    averageOrderValue: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    peakHour: string;
    peakHourOrders: number;
  };
  hourly: Array<{
    hour: string;
    orders: number;
    revenue: number;
    items: number;
  }>;
  categories: Array<{
    category: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  topItems: Array<{
    name: string;
    variantName: string;
    category: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  payments: Array<{
    method: string;
    orders: number;
    amount: number;
  }>;
  modes: Array<{
    mode: string;
    orders: number;
    revenue: number;
  }>;
};

type ApiResponse = {
  data?: Data;
  message?: string;
};

type TooltipPayload = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CHART_COLORS = ["#C8102E", "#173044", "#E8A53A", "#64748B", "#059669"];

const localDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

function subscribeToMobile(callback: () => void) {
  const media = window.matchMedia("(max-width: 639px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

function getMobileServerSnapshot() {
  return false;
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );
}

function Card({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof faReceipt;
}) {
  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="mt-3 truncate text-3xl font-black text-[#173044]">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">{detail}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#C8102E]">
          <FontAwesomeIcon icon={icon} />
        </span>
      </div>
    </article>
  );
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const source = payload[0]?.payload ?? {};
  const revenue = typeof source.revenue === "number" ? source.revenue : null;
  const items = typeof source.items === "number" ? source.items : null;

  return (
    <div className="min-w-36 rounded-2xl border border-[#e5d9cf] bg-white/95 p-3 shadow-xl backdrop-blur">
      {label !== undefined ? (
        <p className="mb-2 text-xs font-black text-[#173044]">{String(label)}</p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={`${entry.name ?? "value"}-${String(entry.value)}`}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-2 font-bold capitalize text-slate-500">
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color ?? "#C8102E" }}
              />
              {entry.name ?? "Value"}
            </span>
            <strong className="text-[#173044]">{String(entry.value ?? 0)}</strong>
          </div>
        ))}
        {revenue !== null ? (
          <div className="flex justify-between gap-4 border-t pt-1.5 text-xs">
            <span className="font-bold text-slate-500">Revenue</span>
            <strong className="text-[#C8102E]">{money.format(revenue)}</strong>
          </div>
        ) : null}
        {items !== null ? (
          <div className="flex justify-between gap-4 text-xs">
            <span className="font-bold text-slate-500">Items</span>
            <strong className="text-[#173044]">{items}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HourlyTrendChart({ rows }: { rows: Data["hourly"] }) {
  const isMobile = useIsMobile();
  const peak = Math.max(0, ...rows.map((row) => row.orders));
  const data = rows.map((row) => ({ ...row, peak: row.orders === peak && peak > 0 }));

  return (
    <div className="h-[250px] w-full min-w-0 sm:h-[310px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 18,
            right: isMobile ? 4 : 16,
            left: isMobile ? -24 : -8,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="trsHourlyArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8102E" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#C8102E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E8EDF2" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={0}
            tick={{ fill: "#64748B", fontSize: isMobile ? 10 : 11, fontWeight: 800 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={isMobile ? 28 : 38}
            tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#E8A53A", strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="#C8102E"
            strokeWidth={3}
            fill="url(#trsHourlyArea)"
            activeDot={{ r: 6, fill: "#E8A53A", stroke: "#C8102E", strokeWidth: 2 }}
            dot={{ r: isMobile ? 3 : 4, fill: "#FFFFFF", stroke: "#C8102E", strokeWidth: 2 }}
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourlyBarChart({ rows }: { rows: Data["hourly"] }) {
  const isMobile = useIsMobile();
  const peak = Math.max(0, ...rows.map((row) => row.orders));
  const data = rows.map((row) => ({ ...row, isPeak: row.orders === peak && peak > 0 }));

  return (
    <div className="h-[255px] w-full min-w-0 sm:h-[330px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barCategoryGap={isMobile ? "20%" : "30%"}
          margin={{
            top: 16,
            right: isMobile ? 0 : 12,
            left: isMobile ? -24 : -8,
            bottom: 0,
          }}
        >
          <CartesianGrid stroke="#EEF2F6" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            interval={0}
            minTickGap={0}
            tick={{ fill: "#64748B", fontSize: isMobile ? 10 : 11, fontWeight: 800 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={isMobile ? 28 : 38}
            tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(232, 165, 58, 0.08)" }} />
          <Bar
            dataKey="orders"
            name="Orders"
            radius={[12, 12, 0, 0]}
            maxBarSize={isMobile ? 42 : 64}
            minPointSize={3}
            animationDuration={650}
          >
            {data.map((entry) => (
              <Cell
                key={entry.hour}
                fill={entry.isPeak ? "#E8A53A" : entry.orders > 0 ? "#C8102E" : "#DCE3EA"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaymentDonut({ rows }: { rows: Data["payments"] }) {
  const isMobile = useIsMobile();
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-hidden min-[1750px]:grid min-[1750px]:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] min-[1750px]:items-center">
      <div className="relative mx-auto h-44 w-full max-w-52 sm:h-48 sm:max-w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="amount"
              nameKey="method"
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 54 : 66}
              outerRadius={isMobile ? 80 : 96}
              paddingAngle={rows.length > 1 ? 2 : 0}
              stroke="none"
              animationDuration={650}
            >
              {rows.map((row, index) => (
                <Cell key={row.method} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [money.format(Number(value ?? 0)), String(name)]}
              contentStyle={{
                borderRadius: 16,
                borderColor: "#e5d9cf",
                boxShadow: "0 14px 30px rgba(15,23,42,.12)",
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Collected
            </p>
            <p className="mt-1 text-lg font-black text-[#173044]">{money.format(total)}</p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1 min-[1750px]:grid-cols-1">
        {rows.map((row, index) => (
          <div
            key={row.method}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 rounded-xl bg-slate-50 px-3 py-2.5"
          >
            <i
              className="row-span-2 h-3 w-3 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="min-w-0 truncate text-sm font-black capitalize text-[#173044]">
              {row.method}
            </span>
            <span className="min-w-0 break-words text-[11px] font-bold leading-4 text-slate-500">
              {row.orders} orders · {money.format(row.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryChart({
  rows,
  valueKey,
}: {
  rows: Data["categories"];
  valueKey: "quantity" | "revenue";
}) {
  const isMobile = useIsMobile();
  const data = rows.slice(0, 10).map((row) => ({
    ...row,
    displayValue: valueKey === "revenue" ? row.revenue : row.quantity,
  }));
  const chartHeight = Math.max(250, data.length * (isMobile ? 45 : 50));

  return (
    <div className="w-full min-w-0" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: isMobile ? 16 : 28, left: isMobile ? 2 : 12, bottom: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid stroke="#EEF2F6" strokeDasharray="4 5" horizontal={false} />
          <XAxis
            type="number"
            hide={isMobile}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 700 }}
            tickFormatter={(value) =>
              valueKey === "revenue" ? money.format(Number(value)) : String(value)
            }
          />
          <YAxis
            type="category"
            dataKey="category"
            axisLine={false}
            tickLine={false}
            width={isMobile ? 104 : 135}
            tick={{ fill: "#173044", fontSize: isMobile ? 10 : 11, fontWeight: 800 }}
          />
          <Tooltip
            formatter={(value) => [
              valueKey === "revenue" ? money.format(Number(value ?? 0)) : Number(value ?? 0),
              valueKey === "revenue" ? "Revenue" : "Quantity",
            ]}
            contentStyle={{
              borderRadius: 16,
              borderColor: "#e5d9cf",
              boxShadow: "0 14px 30px rgba(15,23,42,.12)",
              fontSize: 12,
              fontWeight: 700,
            }}
          />
          <Bar
            dataKey="displayValue"
            name={valueKey === "revenue" ? "Revenue" : "Quantity"}
            fill="#C8102E"
            radius={[0, 10, 10, 0]}
            minPointSize={3}
            maxBarSize={22}
            animationDuration={650}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PosAnalyticsClient() {
  const today = useMemo(() => localDate(new Date()), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(
    () => new URLSearchParams({ from, to, orderMode: "all", saleType: "all" }).toString(),
    [from, to],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/v1/admin/pos/analytics?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load POS analytics.");
      }

      setData(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load POS analytics.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-clip">
      <PageHeader
        eyebrow="POS intelligence"
        title="POS Analytics"
        description="Hourly demand, category performance, item mix, payments and fulfilment intelligence for the counter."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" />
            Refresh
          </button>
        }
      />

      <section className="rounded-3xl border bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs font-black">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.currentTarget.value)}
              className="mt-2 block h-11 max-w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-black">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.currentTarget.value)}
              className="mt-2 block h-11 max-w-full rounded-xl border px-3"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white"
          >
            Apply
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <section className="rounded-3xl border bg-white p-16 text-center font-bold text-slate-400">
          Loading POS analytics…
        </section>
      ) : null}

      {data && !loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card
              label="Orders"
              value={String(data.kpis.orders)}
              detail={`${data.kpis.items} items sold`}
              icon={faReceipt}
            />
            <Card
              label="Recognized sales"
              value={money.format(data.kpis.revenue)}
              detail={`AOV ${money.format(data.kpis.averageOrderValue)}`}
              icon={faIndianRupeeSign}
            />
            <Card
              label="Peak hour"
              value={data.kpis.peakHour}
              detail={`${data.kpis.peakHourOrders} orders`}
              icon={faClock}
            />
            <Card
              label="Categories"
              value={String(data.categories.length)}
              detail="Distinct categories ordered"
              icon={faUtensils}
            />
          </div>

          <div className="grid min-w-0 max-w-full gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
            <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border bg-white p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-[#173044]">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[#C8102E]" />
                    Hourly order trend
                  </h2>
                  <p className="mb-5 mt-1 text-sm text-slate-500">
                    Smooth demand trend from the first order hour to the last order hour,
                    including zero-order gaps.
                  </p>
                </div>
                {data.hourly.length ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C8102E]">
                    {data.kpis.firstOrderAt
                      ? new Date(data.kpis.firstOrderAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                    {" – "}
                    {data.kpis.lastOrderAt
                      ? new Date(data.kpis.lastOrderAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                ) : null}
              </div>
              {data.hourly.length ? (
                <HourlyTrendChart rows={data.hourly} />
              ) : (
                <p className="py-20 text-center font-bold text-slate-400">
                  No orders in this period.
                </p>
              )}
            </section>

            <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border bg-white p-4 sm:p-6">
              <h2 className="text-xl font-black text-[#173044]">Payment mix</h2>
              <p className="mb-5 mt-1 text-sm text-slate-500">
                Share of POS collections by payment method.
              </p>
              {data.payments.length ? (
                <PaymentDonut rows={data.payments} />
              ) : (
                <p className="py-20 text-center font-bold text-slate-400">
                  No payment data in this period.
                </p>
              )}
            </section>
          </div>

          <section className="min-w-0 overflow-hidden rounded-3xl border bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[#173044]">
                  Orders per hour · bar chart
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Direct hour-by-hour order volume comparison. Tap or hover a bar to see
                  revenue and item count.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-2 text-slate-500">
                  <i className="h-3 w-3 rounded-sm bg-[#C8102E]" />
                  Orders
                </span>
                <span className="flex items-center gap-2 text-amber-700">
                  <i className="h-3 w-3 rounded-sm bg-[#E8A53A]" />
                  Peak hour
                </span>
              </div>
            </div>
            <div className="mt-5">
              {data.hourly.length ? (
                <HourlyBarChart rows={data.hourly} />
              ) : (
                <p className="py-20 text-center font-bold text-slate-400">
                  No hourly data in this period.
                </p>
              )}
            </div>
          </section>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-3xl border bg-white p-4 sm:p-6">
              <h2 className="text-xl font-black text-[#173044]">Category quantity</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                Actual units sold, not order-line count.
              </p>
              {data.categories.length ? (
                <CategoryChart rows={data.categories} valueKey="quantity" />
              ) : (
                <p className="py-16 text-center font-bold text-slate-400">
                  No category data.
                </p>
              )}
            </section>

            <section className="min-w-0 overflow-hidden rounded-3xl border bg-white p-4 sm:p-6">
              <h2 className="text-xl font-black text-[#173044]">Category revenue</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                Commercial contribution by category.
              </p>
              {data.categories.length ? (
                <CategoryChart rows={data.categories} valueKey="revenue" />
              ) : (
                <p className="py-16 text-center font-bold text-slate-400">
                  No category data.
                </p>
              )}
            </section>
          </div>

          <section className="min-w-0 overflow-hidden rounded-3xl border bg-white p-4 sm:p-6">
            <h2 className="text-xl font-black text-[#173044]">
              Top-selling items and variants
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="p-3">Item</th>
                    <th>Category</th>
                    <th>Orders</th>
                    <th>Quantity</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((row) => (
                    <tr key={`${row.name}-${row.variantName}`} className="border-b">
                      <td className="p-3 font-black">
                        {row.name}
                        {row.variantName ? (
                          <span className="block text-xs font-bold text-slate-500">
                            {row.variantName}
                          </span>
                        ) : null}
                      </td>
                      <td>{row.category}</td>
                      <td>{row.orders}</td>
                      <td className="font-black">{row.quantity}</td>
                      <td className="font-black text-[#C8102E]">
                        {money.format(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
