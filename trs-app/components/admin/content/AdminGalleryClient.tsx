"use client";

import { faPlus, faSearch, faTrash, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader, SectionCard } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { MediaPicker } from "@/components/admin/media/MediaPicker";

type Api<T> = { data: T; message?: string };
type MediaType = "image" | "video";
type GalleryCategory =
  | "Food"
  | "Food Truck"
  | "Ambience"
  | "Customer Photos"
  | "Videos"
  | "Events";

type GalleryItem = {
  _id: string;
  title: string;
  description: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  category: string;
  altText: string;
  sortOrder: number;
  isPublished: boolean;
};

const categories: readonly GalleryCategory[] = [
  "Food",
  "Food Truck",
  "Ambience",
  "Customer Photos",
  "Videos",
  "Events",
];

const emptyForm = {
  title: "",
  description: "",
  mediaType: "image" as MediaType,
  mediaUrl: "",
  thumbnailUrl: "",
  category: "Food" as GalleryCategory,
  altText: "",
  sortOrder: 0,
  isPublished: true,
};

export function AdminGalleryClient() {
  const [rows, setRows] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [remove, setRemove] = useState<GalleryItem | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/gallery", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await response.json()) as Api<GalleryItem[]>;
      if (!response.ok) throw new Error(json.message || "Unable to load gallery.");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load gallery.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? rows.filter((item) =>
          `${item.title} ${item.category}`.toLowerCase().includes(query),
        )
      : rows;
  }, [rows, search]);

  async function create() {
    if (!form.title.trim()) {
      setMessage("Enter a title for the gallery item.");
      return;
    }
    if (!form.mediaUrl) {
      setMessage("Upload the gallery media file.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/admin/gallery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as Api<unknown>;
      if (!response.ok) throw new Error(json.message || "Unable to create gallery item.");

      setForm(emptyForm);
      setShowForm(false);
      setMessage("Gallery item created and published on the public gallery.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create gallery item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(item: GalleryItem) {
    const response = await fetch(`/api/v1/admin/gallery/${item._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    const json = (await response.json()) as Api<unknown>;
    if (!response.ok) {
      setMessage(json.message || "Unable to update gallery item.");
      return;
    }
    await load();
  }

  async function destroy() {
    if (!remove) return;
    const response = await fetch(`/api/v1/admin/gallery/${remove._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await response.json()) as Api<unknown>;
    if (!response.ok) {
      setMessage(json.message || "Unable to delete gallery item.");
      return;
    }
    setRemove(null);
    await load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Gallery"
        description="Upload public images and videos, assign their category and control publication status."
        action={
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="rounded-xl bg-[#173044] px-4 py-3 text-xs font-black text-white"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add media
          </button>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm font-semibold text-[#8d1b2a]">
          {message}
        </p>
      )}

      {showForm && (
        <SectionCard title="New gallery item">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              aria-label="Media title"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="rounded-xl border p-3"
            />

            <select
              aria-label="Gallery category"
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as GalleryCategory })
              }
              className="rounded-xl border p-3"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              aria-label="Media type"
              value={form.mediaType}
              onChange={(event) => {
                const mediaType = event.target.value as MediaType;
                setForm({
                  ...form,
                  mediaType,
                  mediaUrl: "",
                  thumbnailUrl: "",
                  category: mediaType === "video" ? "Videos" : form.category,
                });
              }}
              className="rounded-xl border p-3"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>

            <input
              aria-label="Alternative text"
              placeholder="Alt text"
              value={form.altText}
              onChange={(event) => setForm({ ...form, altText: event.target.value })}
              className="rounded-xl border p-3"
            />

            <div className="md:col-span-2">
              <MediaPicker
                label={form.mediaType === "image" ? "Gallery image" : "Gallery video"}
                value={form.mediaUrl}
                onChange={(mediaUrl) => setForm({ ...form, mediaUrl })}
                accept={form.mediaType}
                category="gallery"
                required
              />
            </div>

            {form.mediaType === "video" && (
              <div className="md:col-span-2">
                <MediaPicker
                  label="Video thumbnail"
                  value={form.thumbnailUrl}
                  onChange={(thumbnailUrl) => setForm({ ...form, thumbnailUrl })}
                  accept="image"
                  category="gallery-thumbnails"
                />
              </div>
            )}

            <textarea
              aria-label="Media description"
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="rounded-xl border p-3 md:col-span-2"
            />

            <button
              type="button"
              onClick={() => void create()}
              disabled={isSaving}
              className="rounded-xl bg-[#C8102E] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
            >
              {isSaving ? "Publishing…" : "Create gallery item"}
            </button>
          </div>
        </SectionCard>
      )}

      <div className="my-5 flex items-center gap-3 rounded-2xl border border-[#e8ddd3] bg-white px-4">
        <FontAwesomeIcon icon={faSearch} className="text-[#756960]" />
        <input
          aria-label="Search gallery"
          placeholder="Search gallery"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent py-4 outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <article key={item._id} className="overflow-hidden rounded-2xl border bg-white">
            <div className="relative aspect-[4/3] bg-[#f6eee7]">
              {item.mediaType === "image" ? (
                <Image
                  src={item.mediaUrl}
                  alt={item.altText || item.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              ) : item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.altText || item.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              ) : (
                <div className="grid h-full place-items-center text-[#C8102E]">
                  <FontAwesomeIcon icon={faVideo} className="h-10" />
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-xs font-black uppercase text-[#C8102E]">{item.category}</p>
                <h2 className="mt-1 font-black text-[#172536]">{item.title}</h2>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void toggle(item)}
                  className="rounded-lg border px-3 py-2 text-xs font-bold"
                >
                  {item.isPublished ? "Published" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => setRemove(item)}
                  aria-label={`Delete ${item.title}`}
                  className="grid h-10 w-10 place-items-center rounded-lg border text-[#C8102E]"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <CustomActionModal
        open={Boolean(remove)}
        title="Delete gallery item"
        description={remove ? `Delete “${remove.title}”?` : ""}
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setRemove(null)}
        onConfirm={() => void destroy()}
      />
    </div>
  );
}
