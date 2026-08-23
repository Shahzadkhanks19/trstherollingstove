"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faPlus,
  faSearch,
  faTicket,
  faToggleOn,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { localDateTimeInputValue } from "@/lib/validation/dateTime";

function normalizeCouponCode(value: string): string {
  return value
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

type Coupon = {
  _id: string;
  code: string;
  name: string;
  description: string;
  couponChannel: "spin_wheel_only" | "public_offer";
  publicOfferPlacement: "permanent" | "everyday";
  discountType: "percentage" | "fixed" | "free_item";
  freeMenuItemId: string | null;
  discountValue: number;
  minimumOrderAmount: number;
  usedCount: number;
  usageLimit: number | null;
  usageLimitPerCustomer: number;
  applicableOrderModes: Array<"dine_in" | "takeaway">;
  firstOrderOnly: boolean;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

type MenuItemOption = { _id: string; name: string; isActive: boolean; isAvailable: boolean };

type ApiErrorDetail = {
  field?: string;
  path?: string;
  message?: string;
};

type Api<T> = {
  data: T;
  message?: string;
  errors?: ApiErrorDetail[];
};

function apiErrorMessage(json: Api<unknown>, fallback: string): string {
  const details = json.errors
    ?.map((error) => {
      const field = error.field || error.path;
      return `${field ? `${field}: ` : ""}${error.message || "Invalid value."}`;
    })
    .filter(Boolean);

  return details?.length ? details.join(" ") : json.message || fallback;
}

const createEmptyForm = () => ({
  code: "",
  name: "",
  description: "",
  couponChannel: "public_offer" as "spin_wheel_only" | "public_offer",
  publicOfferPlacement: "permanent" as "permanent" | "everyday",
  discountType: "percentage" as "percentage" | "fixed" | "free_item",
  discountValue: 10,
  freeMenuItemId: "",
  minimumOrderAmount: 0,
  usageLimitPerCustomer: 1,
  startsAt: "",
  expiresAt: "",
  applicableOrderModes: ["dine_in", "takeaway"],
  firstOrderOnly: false,
  isActive: true,
});

function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : localDateTimeInputValue(date);
}

function toIsoDate(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AdminCouponsOffersClient() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(createEmptyForm);
  const [showForm, setShowForm] = useState(false);
  const [remove, setRemove] = useState<Coupon | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/admin/coupons?limit=100&search=${encodeURIComponent(search)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as Api<{ coupons: Coupon[] }>;
      if (!response.ok) throw new Error(json.message);
      setRows(json.data.coupons);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    async function loadMenuItems() {
      try {
        const response = await fetch(
          "/api/v1/admin/menu/items?limit=100&isActive=true&isAvailable=true",
          { cache: "no-store" },
        );
        const json = (await response.json()) as Api<MenuItemOption[]>;
        if (!response.ok) throw new Error(json.message);
        setMenuItems(json.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load menu items.");
      }
    }
    void loadMenuItems();
  }, []);

  const active = useMemo(
    () => rows.filter((row) => row.isActive && new Date(row.expiresAt) > new Date()).length,
    [rows],
  );

  function openCreate() {
    setEditingId(null);
    setForm(createEmptyForm());
    setMessage("");
    setShowForm(true);
  }

  function openEdit(row: Coupon) {
    setEditingId(row._id);
    setForm({
      code: row.code,
      name: row.name,
      description: row.description,
      couponChannel: row.couponChannel ?? "public_offer",
      publicOfferPlacement: row.publicOfferPlacement ?? "permanent",
      discountType: row.discountType,
      discountValue: row.discountValue,
      freeMenuItemId: row.freeMenuItemId ?? "",
      minimumOrderAmount: row.minimumOrderAmount,
      usageLimitPerCustomer: row.usageLimitPerCustomer ?? 1,
      startsAt: toLocalDateTimeValue(row.startsAt),
      expiresAt: toLocalDateTimeValue(row.expiresAt),
      applicableOrderModes:
        row.applicableOrderModes?.length > 0
          ? row.applicableOrderModes
          : ["dine_in", "takeaway"],
      firstOrderOnly: row.firstOrderOnly ?? false,
      isActive: row.isActive,
    });
    setMessage("");
    setShowForm(true);
    window.requestAnimationFrame(() => {
      document.getElementById("coupon-campaign-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function closeEditor() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm());
  }

  async function save() {
    const startsAt = toIsoDate(form.startsAt);
    const expiresAt = toIsoDate(form.expiresAt);

    if (!startsAt || !expiresAt) {
      setMessage("Please select valid start and expiry dates.");
      return;
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      setMessage("Expiry must be in the future.");
      return;
    }

    if (new Date(expiresAt) <= new Date(startsAt)) {
      setMessage("Expiry must be after the start date.");
      return;
    }

    if (form.discountType === "free_item" && !form.freeMenuItemId) {
      setMessage("Select the menu item that this coupon will make free.");
      return;
    }

    const payload = {
      ...form,
      code: normalizeCouponCode(form.code),
      name: form.name.trim(),
      description: form.description.trim(),
      discountValue: form.discountType === "free_item" ? 0 : Number(form.discountValue),
      freeMenuItemId: form.discountType === "free_item" ? form.freeMenuItemId : null,
      minimumOrderAmount: Number(form.minimumOrderAmount),
      usageLimitPerCustomer: Number(form.usageLimitPerCustomer),
      startsAt,
      expiresAt,
      maxDiscountAmount: null,
      usageLimit: null,
      applicableCategoryIds: [],
      applicableMenuItemIds: [],
      excludedMenuItemIds: [],
    };

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/v1/admin/coupons/${editingId}` : "/api/v1/admin/coupons",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as Api<unknown>;

      if (!response.ok) {
        setMessage(
          apiErrorMessage(
            json,
            editingId ? "Unable to update coupon." : "Unable to create coupon.",
          ),
        );
        return;
      }

      const wasEditing = Boolean(editingId);
      setShowForm(false);
      setEditingId(null);
      setForm(createEmptyForm());
      setMessage(wasEditing ? "Coupon updated." : "Coupon created.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: Coupon) {
    await fetch(`/api/v1/admin/coupons/${row._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    await load();
  }

  async function destroy() {
    if (!remove) return;
    await fetch(`/api/v1/admin/coupons/${remove._id}`, { method: "DELETE" });
    setRemove(null);
    await load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="Coupons & Offers"
        description="Create promotional codes, limited-time offers and first-order incentives from one place."
        action={
          <button
            onClick={showForm ? closeEditor : openCreate}
            disabled={saving}
            className="rounded-xl bg-[#173044] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            {showForm ? "Close" : "New offer"}
          </button>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm font-semibold text-[#8d1b2a]">
          {message}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs font-black text-slate-500">Total campaigns</p>
          <p className="mt-2 text-3xl font-black text-[#173044]">{rows.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs font-black text-slate-500">Active now</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{active}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs font-black text-slate-500">Redemptions</p>
          <p className="mt-2 text-3xl font-black text-[#173044]">
            {rows.reduce((total, row) => total + row.usedCount, 0)}
          </p>
        </div>
      </div>

      {showForm && (
        <div id="coupon-campaign-editor" className="scroll-mt-28">
          <SectionCard title={editingId ? "Edit coupon or offer" : "Create coupon or offer"}>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                "code",
                "name",
                "description",
                "minimumOrderAmount",
                "startsAt",
                "expiresAt",
              ] as const
            ).map((key) => (
              <label key={key} className={key === "description" ? "md:col-span-2" : ""}>
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                  {key.replaceAll(/([A-Z])/g, " $1")}
                </span>
                <input
                  type={
                    key.includes("At")
                      ? "datetime-local"
                      : key.includes("Value") || key.includes("Amount")
                        ? "number"
                        : "text"
                  }
                  required
                  min={key.includes("At") ? localDateTimeInputValue() : undefined}
                  value={String(form[key])}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]:
                        key === "code"
                          ? normalizeCouponCode(event.target.value)
                          : event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </label>
            ))}


            <label>
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                Coupon type
              </span>
              <select
                value={form.couponChannel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    couponChannel: event.target.value as
                      | "spin_wheel_only"
                      | "public_offer",
                  }))
                }
                className="w-full rounded-xl border px-3 py-2.5"
              >
                <option value="public_offer">Public offer</option>
                <option value="spin_wheel_only">Spin Wheel only</option>
              </select>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">
                {form.couponChannel === "public_offer"
                  ? "Published on the Offers page while active and within its schedule."
                  : "Available only as a Spin Wheel reward and hidden from the Offers page."}
              </p>
            </label>

            {form.couponChannel === "public_offer" && (
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                  Offers page section
                </span>
                <select
                  value={form.publicOfferPlacement}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      publicOfferPlacement: event.target.value as
                        | "permanent"
                        | "everyday",
                    }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                >
                  <option value="permanent">Permanent offer — More Exciting Offers</option>
                  <option value="everyday">Everyday offer — Today&apos;s Hot Offers</option>
                </select>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  Choose where this public coupon will appear on the Offers page.
                </p>
              </label>
            )}

            {form.discountType === "free_item" ? (
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                  Free menu item
                </span>
                <select
                  required
                  value={form.freeMenuItemId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, freeMenuItemId: event.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                >
                  <option value="">Select an item</option>
                  {menuItems.map((item) => (
                    <option key={item._id} value={item._id}>{item.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  The customer must add this item to the cart; one unit will become free. Paid variants and add-ons remain protected by the existing cart pricing rules.
                </p>
              </label>
            ) : (
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                  Discount value
                </span>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={form.discountType === "percentage" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, discountValue: Number(event.target.value) }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </label>
            )}

            <label>
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                Discount type
              </span>
              <select
                value={form.discountType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discountType: event.target.value as "percentage" | "fixed" | "free_item",
                  }))
                }
                className="w-full rounded-xl border px-3 py-2.5"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
                <option value="free_item">Free item</option>
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-[#C8102E] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Update campaign"
                    : "Create campaign"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="rounded-xl border px-4 py-3 text-xs font-black text-[#173044] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>
          </SectionCard>
        </div>
      )}

      <div className="my-5 flex items-center gap-2 rounded-xl border bg-white px-3">
        <FontAwesomeIcon icon={faSearch} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search code or offer name"
          className="w-full py-3 outline-none"
        />
      </div>

      <SectionCard title="All campaigns" subtitle={loading ? "Loading…" : `${rows.length} campaigns`}>
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row._id}
              className="flex flex-col gap-3 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#fff0e8] px-2 py-1 font-mono text-xs font-black text-[#C8102E]">
                    {row.code}
                  </span>
                  <StatusBadge value={row.isActive ? "active" : "inactive"} />
                  <span className="rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                    {row.couponChannel === "spin_wheel_only"
                      ? "Spin Wheel only"
                      : row.publicOfferPlacement === "everyday"
                        ? "Everyday offer"
                        : "Permanent offer"}
                  </span>
                </div>
                <h3 className="mt-2 font-black text-[#173044]">{row.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {row.discountType === "percentage"
                    ? `${row.discountValue}% off`
                    : row.discountType === "fixed"
                      ? `₹${row.discountValue} off`
                      : `Free ${menuItems.find((item) => item._id === row.freeMenuItemId)?.name ?? "item"}`} · Min ₹{row.minimumOrderAmount} · {row.usedCount} uses
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-xl bg-[#173044] px-3 py-2 text-xs font-black text-white"
                  aria-label={`Edit ${row.name}`}
                >
                  <FontAwesomeIcon icon={faPen} className="mr-2" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void toggle(row)}
                  className="rounded-xl border px-3 py-2 text-xs font-black"
                >
                  <FontAwesomeIcon icon={faToggleOn} className="mr-2" />
                  {row.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => setRemove(row)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700"
                  aria-label={`Delete ${row.name}`}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </article>
          ))}

          {!loading && !rows.length && (
            <p className="py-10 text-center text-sm text-slate-500">
              <FontAwesomeIcon icon={faTicket} className="mr-2" />
              No coupons or offers yet.
            </p>
          )}
        </div>
      </SectionCard>

      <CustomActionModal
        open={Boolean(remove)}
        title="Delete campaign?"
        description="This coupon will be disabled and removed from active use."
        tone="danger"
        confirmLabel="Delete"
        onClose={() => setRemove(null)}
        onConfirm={destroy}
      />
    </div>
  );
}
