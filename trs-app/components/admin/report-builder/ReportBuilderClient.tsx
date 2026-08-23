"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faDownload, faFloppyDisk, faPlay, faRotate, faTrash, faStar, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import { PageHeader, SectionCard } from "@/components/admin/AdminPrimitives";
import { ReportConfigurationPanel } from "@/components/admin/report-builder/ReportConfigurationPanel";
import { ReportPreview } from "@/components/admin/report-builder/ReportPreview";
import { ReportHistoryPanel } from "@/components/admin/report-builder/ReportHistoryPanel";
import type { ReportColumnDefinition, ReportDatasetKey, ReportDefinitionInput, ReportPreviewResult } from "@/types/report-builder";

type Dataset = { key: ReportDatasetKey; label: string; description: string; columns: Array<{ key: string; label: string; type: ReportColumnDefinition["type"] }> };
type SavedReport = ReportDefinitionInput & { _id: string; updatedAt: string; isArchived: boolean };
type ReportTemplate = { key: string; label: string; description: string; definition: ReportDefinitionInput };
type ApiResponse<T> = { success: boolean; message: string; data: T };

const emptyForm: ReportDefinitionInput = {
  name: "", description: "", dataset: "orders", columns: [], filters: [], groups: [], sort: [], visualization: "table",
  chart: { categoryField: "", series: [], stacked: false, showLegend: true }, visibility: "private", tags: [], isFavorite: false, isPinned: false, templateKey: "",
};

export function ReportBuilderClient() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [form, setForm] = useState<ReportDefinitionInput>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ReportPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (favoriteOnly) params.set("favorite", "true");
    if (includeArchived) params.set("includeArchived", "true");
    const response = await fetch(`/api/v1/admin/report-builder/definitions?${params.toString()}`, { cache: "no-store" });
    const body = await response.json() as ApiResponse<{ reports: SavedReport[]; datasets: Dataset[] }>;
    if (!response.ok) throw new Error(body.message);
    setReports(body.data.reports); setDatasets(body.data.datasets);
    if (!templates.length) {
      const templateResponse = await fetch("/api/v1/admin/report-builder/templates", { cache: "no-store" });
      const templateBody = await templateResponse.json() as ApiResponse<ReportTemplate[]>;
      if (templateResponse.ok) setTemplates(templateBody.data);
    }
  }, [favoriteOnly, includeArchived, search, templates.length]);
  useEffect(() => { void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Unable to load reports.")); }, [load]);

  const dataset = useMemo(() => datasets.find((item) => item.key === form.dataset), [datasets, form.dataset]);
  function toggleColumn(column: Dataset["columns"][number]) {
    setPreviewResult(null);
    setForm((current) => {
      const removing = current.columns.some((item) => item.key === column.key);
      if (removing) return {
        ...current,
        columns: current.columns.filter((item) => item.key !== column.key),
        groups: current.groups.filter((group) => group.field !== column.key),
        sort: current.sort.filter((sort) => sort.field !== column.key),
        chart: { ...current.chart, categoryField: current.chart.categoryField === column.key ? "" : current.chart.categoryField, series: current.chart.series.filter((series) => series.field !== column.key) },
      };
      return { ...current, columns: [...current.columns, { ...column, aggregation: "none" }] };
    });
  }
  function selectReport(report: SavedReport) {
    setSelectedId(report._id); setPreviewResult(null);
    setForm({
      name: report.name, description: report.description, dataset: report.dataset, columns: report.columns, filters: report.filters ?? [], groups: report.groups ?? [], sort: report.sort ?? [],
      visualization: report.visualization, chart: report.chart ?? { categoryField: "", series: [], stacked: false, showLegend: true }, visibility: report.visibility, tags: report.tags, isFavorite: report.isFavorite, isPinned: report.isPinned ?? false, templateKey: report.templateKey ?? "",
    });
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(selectedId ? `/api/v1/admin/report-builder/definitions/${selectedId}` : "/api/v1/admin/report-builder/definitions", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json() as ApiResponse<SavedReport>; if (!response.ok) throw new Error(body.message);
      setSelectedId(body.data._id); setMessage(body.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save report."); } finally { setBusy(false); }
  }
  async function preview() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/admin/report-builder/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, reportId: selectedId ?? undefined, limit: 100 }) });
      const body = await response.json() as ApiResponse<ReportPreviewResult>; if (!response.ok) throw new Error(body.message);
      setPreviewResult(body.data); setMessage(`${body.message} ${body.data.rowCount} row${body.data.rowCount === 1 ? "" : "s"} in ${body.data.durationMs} ms.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to preview report."); } finally { setBusy(false); }
  }
  async function favoriteReport(report: SavedReport) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/report-builder/definitions/${report._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "favorite", value: !report.isFavorite }) });
      const body = await response.json() as ApiResponse<SavedReport>; if (!response.ok) throw new Error(body.message);
      if (selectedId === report._id) setForm((current) => ({ ...current, isFavorite: body.data.isFavorite }));
      setMessage(body.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update favorite."); } finally { setBusy(false); }
  }

  async function action(action: "duplicate" | "archive" | "favorite" | "pin") {
    if (!selectedId) return; setBusy(true);
    try {
      const selected = reports.find((report) => report._id === selectedId);
      const response = await fetch(`/api/v1/admin/report-builder/definitions/${selectedId}`, action === "duplicate" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) } : action === "favorite" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, value: !selected?.isFavorite }) } : action === "pin" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, value: !selected?.isPinned }) } : { method: "DELETE" });
      const body = await response.json() as ApiResponse<SavedReport>; if (!response.ok) throw new Error(body.message);
      setMessage(body.message);
      if (action === "duplicate" || action === "archive") { setSelectedId(null); setForm(emptyForm); setPreviewResult(null); } else if (action === "favorite") { setForm((current) => ({ ...current, isFavorite: body.data.isFavorite })); } else { setForm((current) => ({ ...current, isPinned: body.data.isPinned })); }
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); } finally { setBusy(false); }
  }

  function applyTemplate(template: ReportTemplate) {
    setSelectedId(null); setPreviewResult(null);
    setForm({ ...template.definition, templateKey: template.key, isPinned: false });
    setMessage(`${template.label} template loaded. Review and save it as a new report.`);
  }

  function exportReport(format: "csv" | "xlsx" | "pdf") {
    if (!selectedId) return;
    window.location.assign(`/api/v1/admin/report-builder/definitions/${selectedId}/export/${format}`);
  }

  return <div className="space-y-6">
    <PageHeader eyebrow="Business Intelligence" title="Custom Report Builder" description="Build grouped, aggregated and visual reports from approved TRS datasets without exposing database queries." />
    {message ? <div role="status" className="rounded-2xl border border-[#E8A53A]/30 bg-[#E8A53A]/10 px-4 py-3 text-sm font-bold text-[#7A4B00]">{message}</div> : null}
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SectionCard title="Saved reports" description={`${reports.length} available`}>
        <button type="button" onClick={() => { setSelectedId(null); setForm(emptyForm); setPreviewResult(null); }} className="mb-3 w-full rounded-xl bg-[#111820] px-4 py-3 text-sm font-black text-white">New report</button>
        {templates.length ? <div className="mb-3 rounded-xl border border-black/10 bg-black/[0.02] p-3"><p className="mb-2 text-xs font-black uppercase tracking-wide text-black/50">Templates</p><div className="space-y-2">{templates.map((template) => <button key={template.key} type="button" onClick={() => applyTemplate(template)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-left"><b className="block text-xs">{template.label}</b><span className="block text-[11px] text-black/50">{template.description}</span></button>)}</div></div> : null}
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports or tags" className="mb-3 w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm" />
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold"><label className="flex items-center gap-1.5"><input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} />Favorites</label><label className="flex items-center gap-1.5"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />Archived</label></div>
        <div className="space-y-2">{reports.map((report) => <div key={report._id} className={`flex items-start gap-2 rounded-xl border p-3 ${selectedId === report._id ? "border-[#C8102E] bg-red-50" : "border-black/10 bg-white"}`}><button type="button" onClick={() => selectReport(report)} className="min-w-0 flex-1 text-left"><b className="block truncate text-sm">{report.name}</b><span className="text-xs text-black/50">{report.dataset.replaceAll("_", " ")} · {report.visualization}{report.isPinned ? " · pinned" : ""}{report.isArchived ? " · archived" : ""}</span></button><button type="button" aria-label={report.isFavorite ? "Remove from favorites" : "Add to favorites"} onClick={() => void favoriteReport(report)} className={`rounded-lg p-2 ${report.isFavorite ? "text-amber-500" : "text-black/30"}`}><FontAwesomeIcon icon={faStar} /></button></div>)}</div>
      </SectionCard>
      <div className="space-y-6">
        <SectionCard title="Report definition" description="Select fields, calculations, groups, filters and a visualization.">
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Report name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-2.5" /></label><label className="text-sm font-bold">Dataset<select value={form.dataset} onChange={(event) => { setPreviewResult(null); setForm({ ...emptyForm, name: form.name, description: form.description, dataset: event.target.value as ReportDatasetKey }); }} className="mt-2 w-full rounded-xl border border-black/15 px-3 py-2.5">{datasets.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div>
          <label className="mt-4 block text-sm font-bold">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-black/15 px-3 py-2.5" /></label>
          <div className="mt-5"><p className="mb-2 text-sm font-black">Dataset columns</p><p className="mb-3 text-xs text-black/50">{dataset?.description}</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{dataset?.columns.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 p-3 text-sm"><input type="checkbox" checked={form.columns.some((item) => item.key === column.key)} onChange={() => toggleColumn(column)} />{column.label}</label>)}</div></div>
          {form.columns.length ? <div className="mt-6 border-t border-black/10 pt-6"><ReportConfigurationPanel dataset={dataset} form={form} onChange={(next) => { setPreviewResult(null); setForm(next); }} /></div> : null}
          <div className="mt-6 flex flex-wrap gap-2"><button type="button" disabled={busy || !form.name || !form.columns.length} onClick={() => void save()} className="rounded-xl bg-[#C8102E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"><FontAwesomeIcon icon={faFloppyDisk} className="mr-2" />Save</button><button type="button" disabled={busy || !form.columns.length} onClick={() => void preview()} className="rounded-xl bg-[#111820] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"><FontAwesomeIcon icon={faPlay} className="mr-2" />Preview</button>{selectedId ? <><button type="button" disabled={busy} onClick={() => void action("favorite")} className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-black text-amber-700"><FontAwesomeIcon icon={faStar} className="mr-2" />{form.isFavorite ? "Unfavorite" : "Favorite"}</button><button type="button" disabled={busy} onClick={() => void action("pin")} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black"><FontAwesomeIcon icon={faThumbtack} className="mr-2" />{form.isPinned ? "Unpin" : "Pin"}</button><button type="button" disabled={busy} onClick={() => exportReport("csv")} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black"><FontAwesomeIcon icon={faDownload} className="mr-2" />CSV</button><button type="button" disabled={busy} onClick={() => exportReport("xlsx")} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black">Excel</button><button type="button" disabled={busy} onClick={() => exportReport("pdf")} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black">PDF</button><button type="button" disabled={busy} onClick={() => window.print()} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black">Print</button><button type="button" disabled={busy} onClick={() => void action("duplicate")} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black"><FontAwesomeIcon icon={faCopy} className="mr-2" />Duplicate</button><button type="button" disabled={busy} onClick={() => void action("archive")} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-black text-red-700"><FontAwesomeIcon icon={faTrash} className="mr-2" />Archive</button></> : null}<button type="button" aria-label="Reload reports" disabled={busy} onClick={() => void load()} className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-black"><FontAwesomeIcon icon={faRotate} /></button></div>
        </SectionCard>
        {previewResult ? <SectionCard title="Report preview" description={`${previewResult.rowCount} rows · ${previewResult.grouped ? "Grouped result" : "Detail result"}`}><ReportPreview rows={previewResult.rows} columns={previewResult.columns} visualization={form.visualization} chart={form.chart} /></SectionCard> : null}
        {selectedId ? <SectionCard title="History and governance" description="Review immutable versions and recent report runs."><ReportHistoryPanel reportId={selectedId} onRestored={async () => { await load(); const response = await fetch(`/api/v1/admin/report-builder/definitions/${selectedId}`, { cache: "no-store" }); const body = await response.json() as ApiResponse<SavedReport>; if (response.ok) selectReport(body.data); }} /></SectionCard> : null}
      </div>
    </div>
  </div>;
}
