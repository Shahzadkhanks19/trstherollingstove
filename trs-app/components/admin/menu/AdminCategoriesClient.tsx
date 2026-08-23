"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRotateRight,
  faFloppyDisk,
  faImage,
  faPen,
  faPlus,
  faSearch,
  faTrash,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { PageHeader } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type ApiResponse<T> = { success: boolean; message: string; data: T };
type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  iconUrl: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
};
type CategoryForm = Omit<Category, "_id">;

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  iconUrl: "",
  sortOrder: 0,
  isActive: true,
  isFeatured: false,
};

export function AdminCategoriesClient({ canCreate, canUpdate, canDelete }: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/menu/categories?includeInactive=true", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<Category[]>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load categories.");
      setCategories(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);
  useRealtimeRefresh({ events: ["menu.updated"], onEvent: () => loadCategories() });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => `${category.name} ${category.slug} ${category.description}`.toLowerCase().includes(query));
  }, [categories, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setEditorOpen(true);
  }

  function openEdit(category: Category) {
    setEditingId(category._id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      iconUrl: category.iconUrl ?? "",
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive,
      isFeatured: category.isFeatured,
    });
    setFormError("");
    setEditorOpen(true);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/v1/admin/uploads/menu", { method: "POST", body });
      const payload = (await response.json()) as ApiResponse<{ url: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Image upload failed.");
      setForm((current) => ({ ...current, imageUrl: payload.data.url }));
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (form.name.trim().length < 2) {
      setFormError("Category name is required.");
      return;
    }
    setActing(true);
    try {
      const response = await fetch(editingId ? `/api/v1/admin/menu/categories/${editingId}` : "/api/v1/admin/menu/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: form.name.trim(), slug: form.slug.trim() || undefined, description: form.description.trim() }),
      });
      const payload = (await response.json()) as ApiResponse<Category>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to save category.");
      setEditorOpen(false);
      setNotice(payload.message);
      await loadCategories();
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Unable to save category.");
    } finally {
      setActing(false);
    }
  }

  async function deleteCategory() {
    if (!categoryToDelete) return;
    setActing(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/menu/categories/${categoryToDelete._id}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<null>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to delete category.");
      setNotice(payload.message);
      setCategoryToDelete(null);
      await loadCategories();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete category.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        eyebrow="Catalog"
        title="Menu Categories"
        description="Create and organize categories used by the TRS menu."
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link href="/admin/menu" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#e5d9cf] bg-white px-4 text-xs font-black text-[#122b3c] sm:flex-none">
              <FontAwesomeIcon icon={faArrowLeft} /> Menu items
            </Link>
            {canCreate && <button onClick={openCreate} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C8102E] px-4 text-xs font-black text-white sm:flex-none"><FontAwesomeIcon icon={faPlus} /> Add category</button>}
          </div>
        }
      />

      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

      <section className="rounded-[24px] border border-[#eadfd5] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 h-3.5 -translate-y-1/2 text-[#8c7f76]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" className="h-11 w-full rounded-2xl border border-[#e5d9cf] bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#C8102E]" />
          </label>
          <button onClick={() => void loadCategories()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#e5d9cf] px-4 text-xs font-black text-[#122b3c] disabled:opacity-50"><FontAwesomeIcon icon={faArrowRotateRight} /> Refresh</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-[24px] bg-[#f1ebe5]" />) : filtered.map((category) => (
          <article key={category._id} className="min-w-0 overflow-hidden rounded-[24px] border border-[#eadfd5] bg-white shadow-sm">
            <div className="relative h-32 bg-[#fff3ec]">
              {category.imageUrl ? <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#C8102E]"><FontAwesomeIcon icon={faImage} className="h-8" /></div>}
              <div className="absolute right-3 top-3 flex gap-2"><StatusBadge active={category.isActive} label={category.isActive ? "Active" : "Inactive"} />{category.isFeatured && <StatusBadge active label="Featured" />}</div>
            </div>
            <div className="min-w-0 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-black text-[#122b3c]">{category.name}</h2><p className="truncate text-xs font-bold text-[#8c7f76]">/{category.slug}</p></div><span className="shrink-0 rounded-full bg-[#f7f1eb] px-2 py-1 text-[10px] font-black text-[#6d5f55]">#{category.sortOrder}</span></div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#6d5f55]">{category.description || "No description added."}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {canUpdate && <button onClick={() => openEdit(category)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e5d9cf] text-xs font-black text-[#122b3c]"><FontAwesomeIcon icon={faPen} /> Edit</button>}
                {canDelete && <button onClick={() => setCategoryToDelete(category)} disabled={acting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 text-xs font-black text-red-600 disabled:opacity-50"><FontAwesomeIcon icon={faTrash} /> Delete</button>}
              </div>
            </div>
          </article>
        ))}
      </section>

      {!loading && filtered.length === 0 && <div className="rounded-[24px] border border-dashed border-[#d9cbc0] bg-white px-6 py-14 text-center"><FontAwesomeIcon icon={faImage} className="h-8 text-[#C8102E]" /><h2 className="mt-4 text-lg font-black text-[#122b3c]">No categories found</h2><p className="mt-1 text-sm text-[#6d5f55]">Create a category or change your search.</p></div>}

      <AnimatePresence>
        {editorOpen && <>
          <motion.button aria-label="Close category editor" onClick={() => setEditorOpen(false)} className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} className="fixed inset-x-0 bottom-0 z-[111] max-h-[92dvh] overflow-y-auto rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-xl sm:rounded-none" >
            <form onSubmit={saveCategory}>
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e8ddd3] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C8102E]">Category editor</p><h2 className="mt-1 text-xl font-black text-[#122b3c]">{editingId ? "Edit category" : "Create category"}</h2></div><button type="button" onClick={() => setEditorOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf]"><FontAwesomeIcon icon={faXmark} /></button></div>
              <div className="space-y-5 p-4 sm:p-6">
                {formError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{formError}</div>}
                <div className="overflow-hidden rounded-[22px] border border-dashed border-[#d9cbc0] bg-white">
                  <div className="grid min-h-44 place-items-center bg-[#fff3ec]">{form.imageUrl ? <img src={form.imageUrl} alt="Category preview" className="h-44 w-full object-cover" /> : <div className="text-center text-[#8c7f76]"><FontAwesomeIcon icon={faImage} className="h-8" /><p className="mt-2 text-xs font-bold">No category image</p></div>}</div>
                  <div className="flex flex-wrap gap-2 p-3"><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#122b3c] px-4 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faUpload} />{uploading ? "Uploading…" : "Upload from device"}</button>{form.imageUrl && <button type="button" onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))} className="h-10 rounded-xl border border-red-100 px-4 text-xs font-black text-red-600">Remove</button>}</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Category name *"><input className="field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="Slug"><input className="field" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Generated automatically" /></Field><Field label="Sort order"><input className="field" type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} /></Field></div>
                <Field label="Description"><textarea className="field min-h-28 py-3" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
                <div className="grid gap-3 sm:grid-cols-2"><Toggle label="Active" checked={form.isActive} onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} /><Toggle label="Featured" checked={form.isFeatured} onChange={(checked) => setForm((current) => ({ ...current, isFeatured: checked }))} /></div>
              </div>
              <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#e8ddd3] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur"><button type="button" onClick={() => setEditorOpen(false)} className="h-11 rounded-2xl border border-[#e5d9cf] text-xs font-black text-[#122b3c]">Cancel</button><button disabled={acting || uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-60"><FontAwesomeIcon icon={faFloppyDisk} />{acting ? "Saving…" : "Save category"}</button></div>
            </form>
          </motion.aside>
        </>}
      </AnimatePresence>
      <style jsx global>{`.field{height:44px;width:100%;border:1px solid #e5d9cf;border-radius:14px;background:#fff;padding-left:12px;padding-right:12px;font-size:13px;font-weight:600;outline:none}.field:focus{border-color:#C8102E;box-shadow:0 0 0 3px rgba(200,16,46,.08)}`}</style>
      <CustomActionModal
        open={Boolean(categoryToDelete)}
        title="Delete category?"
        description={`${categoryToDelete?.name ?? "This category"} will be permanently deleted. Categories containing menu items cannot be deleted.`}
        confirmLabel="Delete category"
        tone="danger"
        loading={acting}
        onClose={() => { if (!acting) setCategoryToDelete(null); }}
        onConfirm={deleteCategory}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-[#81746b]">{label}</span>{children}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center justify-between rounded-2xl border border-[#e5d9cf] bg-white px-4 py-3 text-xs font-black text-[#122b3c]"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#C8102E]" /></label>; }
function StatusBadge({ active, label }: { active: boolean; label: string }) { return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{label}</span>; }
