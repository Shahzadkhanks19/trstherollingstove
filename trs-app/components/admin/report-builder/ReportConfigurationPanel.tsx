"use client";

import type {
  ReportAggregation,
  ReportColumnDefinition,
  ReportDatasetKey,
  ReportDefinitionInput,
  ReportFilterOperator,
  ReportVisualization,
} from "@/types/report-builder";

type Dataset = {
  key: ReportDatasetKey;
  label: string;
  description: string;
  columns: Array<{ key: string; label: string; type: ReportColumnDefinition["type"] }>;
};

type Props = {
  dataset?: Dataset;
  form: ReportDefinitionInput;
  onChange: (next: ReportDefinitionInput) => void;
};

const aggregationOptions: Array<{ value: ReportAggregation; label: string }> = [
  { value: "none", label: "No aggregation" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count rows" },
];
const filterOperators: Array<{ value: ReportFilterOperator; label: string }> = [
  { value: "eq", label: "Equals" }, { value: "neq", label: "Does not equal" },
  { value: "contains", label: "Contains" }, { value: "gte", label: "Greater than or equal" },
  { value: "lte", label: "Less than or equal" }, { value: "in", label: "Is one of" },
];
const visualizations: Array<{ value: ReportVisualization; label: string }> = [
  { value: "table", label: "Table" }, { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart" }, { value: "pie", label: "Pie chart" },
  { value: "kpi", label: "KPI cards" },
];

export function ReportConfigurationPanel({ dataset, form, onChange }: Props) {
  const selectedKeys = new Set(form.columns.map((column) => column.key));
  const selectedNumeric = form.columns.filter((column) => column.type === "number");

  function updateColumn(key: string, patch: Partial<ReportColumnDefinition>) {
    onChange({ ...form, columns: form.columns.map((column) => column.key === key ? { ...column, ...patch } : column) });
  }
  function addFilter() {
    const field = form.columns[0]?.key ?? dataset?.columns[0]?.key;
    if (!field) return;
    onChange({ ...form, filters: [...form.filters, { field, operator: "eq", value: "" }] });
  }
  function addGroup() {
    const candidate = form.columns.find((column) => !form.groups.some((group) => group.field === column.key));
    if (!candidate) return;
    onChange({ ...form, groups: [...form.groups, { field: candidate.key, interval: "none" }] });
  }
  function addSort() {
    const field = form.columns[0]?.key;
    if (!field) return;
    onChange({ ...form, sort: [...form.sort, { field, direction: "desc" }] });
  }
  function setVisualization(visualization: ReportVisualization) {
    const categoryField = form.chart.categoryField || form.groups[0]?.field || form.columns[0]?.key || "";
    const firstNumeric = selectedNumeric[0];
    onChange({
      ...form,
      visualization,
      chart: {
        ...form.chart,
        categoryField,
        series: form.chart.series.length || !firstNumeric ? form.chart.series : [{ field: firstNumeric.key, label: firstNumeric.label }],
      },
    });
  }

  return <div className="space-y-6">
    <div>
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">Selected columns</h3><p className="text-xs text-black/50">Choose calculations for numeric fields.</p></div></div>
      <div className="mt-3 space-y-2">
        {form.columns.map((column) => <div key={column.key} className="grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
          <div><b className="block text-sm">{column.label}</b><span className="text-xs uppercase tracking-wide text-black/45">{column.type}</span></div>
          <select aria-label={`Aggregation for ${column.label}`} value={column.aggregation} onChange={(event) => updateColumn(column.key, { aggregation: event.target.value as ReportAggregation })} className="rounded-xl border border-black/15 px-3 py-2 text-sm" disabled={column.type !== "number" && column.aggregation !== "count"}>
            {aggregationOptions.filter((option) => column.type === "number" || option.value === "none" || option.value === "count").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>)}
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">Filters</h3><p className="text-xs text-black/50">All filters are combined with AND.</p></div><button type="button" onClick={addFilter} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-black">Add filter</button></div>
      <div className="mt-3 space-y-2">{form.filters.map((filter, index) => <div key={`${filter.field}-${index}`} className="grid gap-2 rounded-xl border border-black/10 p-3 lg:grid-cols-[1fr_190px_1fr_auto]">
        <select value={filter.field} onChange={(event) => onChange({ ...form, filters: form.filters.map((item, itemIndex) => itemIndex === index ? { ...item, field: event.target.value } : item) })} className="rounded-xl border border-black/15 px-3 py-2 text-sm">{dataset?.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select>
        <select value={filter.operator} onChange={(event) => onChange({ ...form, filters: form.filters.map((item, itemIndex) => itemIndex === index ? { ...item, operator: event.target.value as ReportFilterOperator } : item) })} className="rounded-xl border border-black/15 px-3 py-2 text-sm">{filterOperators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select>
        <input value={Array.isArray(filter.value) ? filter.value.join(", ") : String(filter.value)} onChange={(event) => onChange({ ...form, filters: form.filters.map((item, itemIndex) => itemIndex === index ? { ...item, value: item.operator === "in" ? event.target.value.split(",").map((value) => value.trim()).filter(Boolean) : event.target.value } : item) })} placeholder={filter.operator === "in" ? "Comma-separated values" : "Filter value"} className="rounded-xl border border-black/15 px-3 py-2 text-sm" />
        <button type="button" onClick={() => onChange({ ...form, filters: form.filters.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700">Remove</button>
      </div>)}</div>
    </div>

    <div>
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">Grouping</h3><p className="text-xs text-black/50">Group rows before applying aggregations.</p></div><button type="button" onClick={addGroup} disabled={form.groups.length >= form.columns.length} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-black disabled:opacity-40">Add group</button></div>
      <div className="mt-3 space-y-2">{form.groups.map((group, index) => {
        const groupColumn = form.columns.find((column) => column.key === group.field);
        return <div key={`${group.field}-${index}`} className="grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-[1fr_180px_auto]">
          <select value={group.field} onChange={(event) => onChange({ ...form, groups: form.groups.map((item, itemIndex) => itemIndex === index ? { ...item, field: event.target.value, interval: "none" } : item) })} className="rounded-xl border border-black/15 px-3 py-2 text-sm">{form.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select>
          <select value={group.interval} disabled={groupColumn?.type !== "date"} onChange={(event) => onChange({ ...form, groups: form.groups.map((item, itemIndex) => itemIndex === index ? { ...item, interval: event.target.value as typeof item.interval } : item) })} className="rounded-xl border border-black/15 px-3 py-2 text-sm disabled:bg-black/5"><option value="none">Exact value</option><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select>
          <button type="button" onClick={() => onChange({ ...form, groups: form.groups.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700">Remove</button>
        </div>;
      })}</div>
    </div>

    <div>
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black">Sorting</h3><p className="text-xs text-black/50">Sort generated columns after aggregation.</p></div><button type="button" onClick={addSort} disabled={!form.columns.length || form.sort.length >= 5} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-black disabled:opacity-40">Add sort</button></div>
      <div className="mt-3 space-y-2">{form.sort.map((sort, index) => <div key={`${sort.field}-${index}`} className="grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-[1fr_160px_auto]">
        <select value={sort.field} onChange={(event) => onChange({ ...form, sort: form.sort.map((item, itemIndex) => itemIndex === index ? { ...item, field: event.target.value } : item) })} className="rounded-xl border border-black/15 px-3 py-2 text-sm">{form.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select>
        <select value={sort.direction} onChange={(event) => onChange({ ...form, sort: form.sort.map((item, itemIndex) => itemIndex === index ? { ...item, direction: event.target.value as "asc" | "desc" } : item) })} className="rounded-xl border border-black/15 px-3 py-2 text-sm"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
        <button type="button" onClick={() => onChange({ ...form, sort: form.sort.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700">Remove</button>
      </div>)}</div>
    </div>

    <div>
      <h3 className="text-sm font-black">Visualization</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">{visualizations.map((option) => <button key={option.value} type="button" onClick={() => setVisualization(option.value)} className={`rounded-xl border px-3 py-2.5 text-xs font-black ${form.visualization === option.value ? "border-[#C8102E] bg-red-50 text-[#C8102E]" : "border-black/10"}`}>{option.label}</button>)}</div>
      {form.visualization !== "table" ? <div className="mt-4 grid gap-3 rounded-xl border border-black/10 p-4 md:grid-cols-2">
        <label className="text-xs font-black">Category field<select value={form.chart.categoryField} onChange={(event) => onChange({ ...form, chart: { ...form.chart, categoryField: event.target.value } })} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-2 text-sm"><option value="">Select field</option>{form.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
        {form.visualization !== "kpi" ? <div><p className="text-xs font-black">Numeric series</p><div className="mt-2 flex flex-wrap gap-2">{selectedNumeric.map((column) => { const checked = form.chart.series.some((series) => series.field === column.key); return <label key={column.key} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs"><input type="checkbox" checked={checked} onChange={() => onChange({ ...form, chart: { ...form.chart, series: checked ? form.chart.series.filter((series) => series.field !== column.key) : [...form.chart.series, { field: column.key, label: column.label }] } })} />{column.label}</label>; })}</div></div> : null}
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.chart.showLegend} onChange={(event) => onChange({ ...form, chart: { ...form.chart, showLegend: event.target.checked } })} />Show legend</label>
        {form.visualization === "bar" ? <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.chart.stacked} onChange={(event) => onChange({ ...form, chart: { ...form.chart, stacked: event.target.checked } })} />Stack series</label> : null}
      </div> : null}
    </div>

    {!selectedKeys.size ? <p className="rounded-xl bg-black/5 p-3 text-sm text-black/60">Select at least one dataset column to configure the report.</p> : null}
  </div>;
}
