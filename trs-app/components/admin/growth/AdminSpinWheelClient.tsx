"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faGift,
  faPen,
  faPlus,
  faPowerOff,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/admin/AdminPrimitives";
import { localDateTimeInputValue } from "@/lib/validation/dateTime";

type Prize = {
  label: string;
  type: "coins" | "coupon" | "try_again";
  value: number;
  couponCode: string;
  weight: number;
  isActive: boolean;
};

type Campaign = {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  dailySpinLimit: number;
  startsAt: string;
  expiresAt: string;
  prizes: Prize[];
};

type SpinWheelCoupon = {
  _id: string;
  code: string;
  name: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  couponChannel: "spin_wheel_only";
};

type ApiResponse<T> = {
  data: T;
  message?: string;
};

const basePrize: Prize = {
  label: "10 TRS Coins",
  type: "coins",
  value: 10,
  couponCode: "",
  weight: 20,
  isActive: true,
};

const createInitialForm = () => ({
  name: "Daily Spin",
  description: "Daily reward wheel",
  dailySpinLimit: 1,
  startsAt: "",
  expiresAt: "",
  isActive: true,
  prizes: [
    { ...basePrize },
    {
      ...basePrize,
      label: "Try Again",
      type: "try_again" as const,
      value: 0,
      weight: 30,
    },
  ] as Prize[],
});

function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return localDateTimeInputValue(date);
}

function toIsoDate(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AdminSpinWheelClient() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [spinCoupons, setSpinCoupons] = useState<SpinWheelCoupon[]>([]);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/admin/spin-wheel", { cache: "no-store" });
    const json = await response.json();
    if (response.ok) setRows(json.data || []);
  }, []);

  const loadSpinCoupons = useCallback(async () => {
    const response = await fetch(
      "/api/v1/admin/coupons?limit=100&active=true&channel=spin_wheel_only",
      { cache: "no-store" },
    );
    const json = (await response.json()) as ApiResponse<{
      coupons: SpinWheelCoupon[];
    }>;

    if (!response.ok) {
      setMessage(json.message || "Unable to load Spin Wheel coupons.");
      return;
    }

    setSpinCoupons(json.data.coupons);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      void loadSpinCoupons();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, loadSpinCoupons]);

  function openCreate() {
    setEditingId(null);
    setViewingId(null);
    setForm(createInitialForm());
    setMessage("");
    setShow(true);
  }

  function openEdit(row: Campaign) {
    setEditingId(row._id);
    setViewingId(null);
    setForm({
      name: row.name,
      description: row.description,
      dailySpinLimit: row.dailySpinLimit,
      startsAt: toLocalDateTimeValue(row.startsAt),
      expiresAt: toLocalDateTimeValue(row.expiresAt),
      isActive: row.isActive,
      prizes: row.prizes.map((prize) => ({ ...prize })),
    });
    setMessage("");
    setShow(true);
  }

  function closeEditor() {
    if (saving) return;
    setShow(false);
    setEditingId(null);
    setForm(createInitialForm());
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

    if (form.prizes.length < 2) {
      setMessage("A spin wheel must contain at least two prize segments.");
      return;
    }

    const invalidPrize = form.prizes.some(
      (prize) => !prize.label.trim() || Number(prize.weight) < 1,
    );
    if (invalidPrize) {
      setMessage("Every prize segment needs a label and a weight of at least 1.");
      return;
    }

    const missingCoupon = form.prizes.some(
      (prize) => prize.type === "coupon" && !prize.couponCode.trim(),
    );
    if (missingCoupon) {
      setMessage("Select a Spin Wheel Only coupon for every coupon prize segment.");
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      dailySpinLimit: Number(form.dailySpinLimit),
      startsAt,
      expiresAt,
      prizes: form.prizes.map((prize) => ({
        ...prize,
        label: prize.label.trim(),
        couponCode: prize.couponCode.trim().toUpperCase(),
        value: Number(prize.value),
        weight: Number(prize.weight),
      })),
    };

    setSaving(true);
    const response = await fetch("/api/v1/admin/spin-wheel", {
      method: editingId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    });
    const json = await response.json();

    if (!response.ok) {
      setSaving(false);
      setMessage(
        json.message ||
          (editingId ? "Unable to update campaign." : "Unable to create campaign."),
      );
      return;
    }

    const wasEditing = Boolean(editingId);
    setShow(false);
    setEditingId(null);
    setForm(createInitialForm());
    setSaving(false);
    setMessage(
      wasEditing ? "Spin wheel campaign updated." : "Spin wheel campaign created.",
    );
    await load();
  }

  async function deleteCampaign() {
    if (!deletingCampaign) return;

    const response = await fetch("/api/v1/admin/spin-wheel", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: deletingCampaign._id }),
    });
    const json = await response.json();

    if (!response.ok) {
      setMessage(json.message || "Unable to delete spin wheel campaign.");
      return;
    }

    const deletedId = deletingCampaign._id;
    setDeletingCampaign(null);
    setViewingId((current) => (current === deletedId ? null : current));
    if (editingId === deletedId) {
      setShow(false);
      setEditingId(null);
      setForm(createInitialForm());
    }
    setMessage("Spin wheel campaign deleted.");
    await load();
  }

  async function activate(row: Campaign) {
    const nextActiveState = !row.isActive;
    const response = await fetch("/api/v1/admin/spin-wheel", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: row._id, isActive: nextActiveState }),
    });
    const json = await response.json();

    if (!response.ok) {
      setMessage(json.message || "Unable to update campaign status.");
      return;
    }

    setMessage(
      nextActiveState
        ? "Spin wheel campaign activated and published on the public site."
        : "Spin wheel campaign deactivated.",
    );
    await load();
  }

  function updatePrize(index: number, key: keyof Prize, value: string | number | boolean) {
    setForm((current) => ({
      ...current,
      prizes: current.prizes.map((prize, prizeIndex) =>
        prizeIndex === index ? { ...prize, [key]: value } : prize,
      ),
    }));
  }

  function addPrize() {
    setForm((current) => ({
      ...current,
      prizes: [...current.prizes, { ...basePrize }],
    }));
  }

  function removePrize(index: number) {
    if (form.prizes.length <= 2) {
      setMessage("A spin wheel must keep at least two prize segments.");
      return;
    }

    setForm((current) => ({
      ...current,
      prizes: current.prizes.filter((_, prizeIndex) => prizeIndex !== index),
    }));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Growth"
        title="Spin Wheel"
        description="Configure prize segments, probabilities, schedule and the single active customer wheel."
        action={
          <button
            onClick={show ? closeEditor : openCreate}
            className="rounded-xl bg-[#173044] px-4 py-3 text-xs font-black text-white"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            {show ? "Close" : "New wheel"}
          </button>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm font-semibold text-[#8d1b2a]">
          {message}
        </p>
      )}

      {show && (
        <SectionCard title={editingId ? "Edit spin wheel campaign" : "Create spin wheel campaign"}>
          <div className="grid gap-3 md:grid-cols-2">
            {(["name", "description", "startsAt", "expiresAt"] as const).map((key) => (
              <label key={key}>
                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                  {key}
                </span>
                <input
                  type={key.includes("At") ? "datetime-local" : "text"}
                  required
                  min={
                    key === "expiresAt" || (!editingId && key === "startsAt")
                      ? localDateTimeInputValue()
                      : undefined
                  }
                  value={String(form[key])}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2.5"
                />
              </label>
            ))}

            <label>
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                Daily spin limit
              </span>
              <input
                type="number"
                min={1}
                value={form.dailySpinLimit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dailySpinLimit: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border px-3 py-2.5"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border px-3 py-2.5 md:self-end">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[#C8102E]"
              />
              <span>
                <span className="block text-xs font-black text-[#173044]">
                  Publish on public site
                </span>
                <span className="block text-[11px] font-semibold text-slate-500">
                  Visible only while the selected schedule is currently running.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-5 space-y-3">
            {form.prizes.map((prize, index) => (
              <div
                key={`${index}-${prize.type}`}
                className="rounded-2xl border p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Prize segment {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removePrize(index)}
                    disabled={form.prizes.length <= 2}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Remove prize segment ${index + 1}`}
                    title={
                      form.prizes.length <= 2
                        ? "At least two prize segments are required"
                        : "Remove prize segment"
                    }
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Segment name
                    </span>
                    <input
                      value={prize.label}
                      onChange={(event) => updatePrize(index, "label", event.target.value)}
                      className="w-full rounded-lg border px-2 py-2"
                      placeholder="e.g. 10 TRS Coins"
                    />
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Reward type
                    </span>
                    <select
                      value={prize.type}
                      onChange={(event) =>
                        updatePrize(index, "type", event.target.value as Prize["type"])
                      }
                      className="w-full rounded-lg border px-2 py-2"
                    >
                      <option value="coins">TRS Coins</option>
                      <option value="coupon">Coupon</option>
                      <option value="try_again">Try again</option>
                    </select>
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Reward value
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={prize.value}
                      onChange={(event) =>
                        updatePrize(index, "value", Number(event.target.value))
                      }
                      className="w-full rounded-lg border px-2 py-2 disabled:bg-slate-100"
                      placeholder={prize.type === "coins" ? "Number of coins" : "0"}
                      disabled={prize.type === "try_again"}
                    />
                    <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">
                      {prize.type === "coins"
                        ? "TRS Coins awarded"
                        : prize.type === "coupon"
                          ? "Keep 0 unless used by coupon logic"
                          : "Not applicable"}
                    </span>
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Coupon code
                    </span>
                    <select
                      value={prize.couponCode}
                      onChange={(event) =>
                        updatePrize(index, "couponCode", event.target.value)
                      }
                      className="w-full rounded-lg border px-2 py-2 disabled:bg-slate-100"
                      disabled={prize.type !== "coupon"}
                    >
                      <option value="">Select coupon</option>
                      {prize.couponCode &&
                        !spinCoupons.some((coupon) => coupon.code === prize.couponCode) && (
                          <option value={prize.couponCode}>
                            {prize.couponCode} (currently unavailable)
                          </option>
                        )}
                      {spinCoupons.map((coupon) => (
                        <option key={coupon._id} value={coupon.code}>
                          {coupon.code} — {coupon.name}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">
                      {prize.type === "coupon"
                        ? spinCoupons.length
                          ? "Only active Spin Wheel Only coupons are listed"
                          : "Create an active Spin Wheel Only coupon first"
                        : "Available for coupon rewards"}
                    </span>
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Probability weight
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={prize.weight}
                      onChange={(event) =>
                        updatePrize(index, "weight", Number(event.target.value))
                      }
                      className="w-full rounded-lg border px-2 py-2"
                      placeholder="e.g. 20"
                    />
                    <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">
                      Higher weight means a higher chance
                    </span>
                  </label>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addPrize}
                className="rounded-xl border px-3 py-2 text-xs font-black"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add prize segment
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-[#C8102E] px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Update campaign" : "Save campaign"}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="mt-5">
        <SectionCard title="Wheel campaigns" subtitle={`${rows.length} configured`}>
          <div className="space-y-3">
            {rows.map((row) => (
              <article
                key={row._id}
                className="flex flex-col gap-3 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex gap-2">
                    <StatusBadge value={row.isActive ? "active" : "inactive"} />
                    <span className="text-xs font-black text-slate-500">
                      {row.prizes.length} segments
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-[#173044]">{row.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.dailySpinLimit} spin(s) per customer daily
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setViewingId((current) => (current === row._id ? null : row._id))
                    }
                    className="rounded-xl border px-4 py-2 text-xs font-black text-[#173044]"
                    aria-expanded={viewingId === row._id}
                    aria-controls={`spin-wheel-details-${row._id}`}
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    {viewingId === row._id ? "Hide" : "View"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="rounded-xl bg-[#173044] px-4 py-2 text-xs font-black text-white"
                  >
                    <FontAwesomeIcon icon={faPen} className="mr-2" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void activate(row)}
                    className={`rounded-xl px-4 py-2 text-xs font-black ${
                      row.isActive
                        ? "border border-red-200 text-red-700"
                        : "bg-emerald-700 text-white"
                    }`}
                  >
                    <FontAwesomeIcon icon={faPowerOff} className="mr-2" />
                    {row.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCampaign(row)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black text-red-700"
                    aria-label={`Delete ${row.name} spin wheel campaign`}
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    Delete
                  </button>
                </div>
                {viewingId === row._id && (
                  <div
                    id={`spin-wheel-details-${row._id}`}
                    className="w-full rounded-2xl bg-slate-50 p-4 lg:basis-full"
                  >
                    <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="font-black uppercase text-slate-400">Description</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {row.description || "No description"}
                        </p>
                      </div>
                      <div>
                        <p className="font-black uppercase text-slate-400">Starts</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {new Date(row.startsAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-black uppercase text-slate-400">Expires</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {new Date(row.expiresAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-black uppercase text-slate-400">Daily limit</p>
                        <p className="mt-1 font-semibold text-slate-700">
                          {row.dailySpinLimit} spin(s)
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {row.prizes.map((prize, index) => (
                        <div key={`${row._id}-${index}`} className="rounded-xl border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-[#173044]">{prize.label}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                                {prize.type.replaceAll("_", " ")} · Weight {prize.weight}
                              </p>
                            </div>
                            <StatusBadge value={prize.isActive ? "active" : "inactive"} />
                          </div>
                          {prize.type === "coins" && (
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                              {prize.value} TRS Coins
                            </p>
                          )}
                          {prize.type === "coupon" && (
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                              Coupon: {prize.couponCode}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}

            {!rows.length && (
              <p className="py-10 text-center text-sm text-slate-500">
                <FontAwesomeIcon icon={faGift} className="mr-2" />
                No wheel campaign configured.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <CustomActionModal
        open={Boolean(deletingCampaign)}
        title="Delete spin wheel campaign?"
        description={
          deletingCampaign
            ? `This will remove “${deletingCampaign.name}” from the admin list and immediately deactivate it. Existing spin history and audit records will be preserved.`
            : "This campaign will be removed."
        }
        confirmLabel="Delete campaign"
        tone="danger"
        onClose={() => setDeletingCampaign(null)}
        onConfirm={deleteCampaign}
      />
    </div>
  );
}
