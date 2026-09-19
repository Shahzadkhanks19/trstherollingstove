"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ApiResponse, PickupPerson, Supplier, VendorDraft } from "@/components/admin/purchasing/admin-purchasing.types";

const inputClass="h-11 w-full min-w-0 rounded-xl border border-[#e1d6cd] bg-white px-3 text-sm font-semibold text-[#173044] outline-none focus:border-[#C8102E]";

export function CreateVendorDrawer({
  suppliers,
  pickupPeople,
  onClose,
  onChanged,
  onDeleteVendor,
  onDeletePickup,
}: {
  suppliers: Supplier[];
  pickupPeople: PickupPerson[];
  onClose: () => void;
  onChanged: () => Promise<void>;
  onDeleteVendor: (supplier: Supplier) => void;
  onDeletePickup: (person: PickupPerson) => void;
}) {
  const [mode, setMode] = useState<"vendor" | "pickup">("vendor");
  const [form, setForm] = useState<VendorDraft>({
    name: "",
    code: "",
    contactPerson: "",
    phone: "",
    alternatePhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    notes: "",
  });
  const [pickup, setPickup] = useState({ name: "", whatsappNumber: "" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const phonePattern = /^(?:\+91)?[6-9]\d{9}$/;
  function update(key: keyof VendorDraft, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function cleanPhone(value: string) {
    return value.replace(/\D/g, "").slice(0, 10);
  }

  async function request(url: string, options: RequestInit) {
    setSaving(true);
    setErrors({});
    try {
      const response = await fetch(url, options);
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok)
        throw new Error(payload.message || "Unable to save changes.");
      await onChanged();
      return true;
    } catch (caught) {
      setErrors({
        form:
          caught instanceof Error ? caught.message : "Unable to save changes.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const next: Record<string, string> = {};
    if (mode === "vendor") {
      if (form.name.trim().length < 2)
        next.name = "Enter at least 2 characters.";
      if (!/^[A-Za-z0-9_-]{2,40}$/.test(form.code))
        next.code = "Use 2–40 letters, numbers, _ or -.";
      if (!phonePattern.test(form.phone.trim()))
        next.phone = "Enter a valid 10-digit Indian WhatsApp number.";
      if (form.alternatePhone && !phonePattern.test(form.alternatePhone.trim()))
        next.alternatePhone = "Enter a valid 10-digit Indian phone number.";
    } else {
      if (pickup.name.trim().length < 2)
        next.name = "Enter at least 2 characters.";
      if (!phonePattern.test(pickup.whatsappNumber.trim()))
        next.whatsappNumber = "Enter a valid 10-digit Indian WhatsApp number.";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      event.currentTarget
        .querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
        ?.focus();
      return;
    }
    const saved = await request(
      mode === "vendor"
        ? "/api/v1/admin/suppliers"
        : "/api/v1/admin/purchases/pickup-persons",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "vendor"
            ? {
                ...form,
                name: form.name.trim(),
                code: form.code.trim(),
                phone: form.phone.trim(),
                alternatePhone: form.alternatePhone.trim(),
              }
            : {
                name: pickup.name.trim(),
                whatsappNumber: pickup.whatsappNumber.trim(),
              },
        ),
      },
    );
    if (!saved) return;
    if (mode === "vendor")
      setForm({
        name: "",
        code: "",
        contactPerson: "",
        phone: "",
        alternatePhone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        notes: "",
      });
    else setPickup({ name: "", whatsappNumber: "" });
  }

  async function toggleVendor(supplier: Supplier) {
    await request(`/api/v1/admin/suppliers/${supplier._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !supplier.isActive }),
    });
  }
  async function togglePickup(person: PickupPerson) {
    await request(`/api/v1/admin/purchases/pickup-persons/${person._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !person.isActive }),
    });
  }

  return (
    <Drawer
      title={mode === "vendor" ? "Manage vendors" : "Manage pickup people"}
      eyebrow="Purchasing contacts"
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("vendor");
                setErrors({});
              }}
              className={`rounded-xl px-4 py-2 text-xs font-black ${mode === "vendor" ? "bg-[#173044] text-white" : "bg-[#f4ede7] text-[#173044]"}`}
            >
              Vendors ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("pickup");
                setErrors({});
              }}
              className={`rounded-xl px-4 py-2 text-xs font-black ${mode === "pickup" ? "bg-[#173044] text-white" : "bg-[#f4ede7] text-[#173044]"}`}
            >
              Pickup people ({pickupPeople.length})
            </button>
          </div>
          {errors.form && <ValidationError message={errors.form} />}
          {mode === "vendor" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Vendor name *" error={errors.name}>
                  <input
                    name="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Vendor code *" error={errors.code}>
                  <input
                    name="code"
                    maxLength={40}
                    value={form.code}
                    onChange={(e) =>
                      update(
                        "code",
                        e.target.value
                          .replace(/[^A-Za-z0-9_-]/g, "")
                          .toUpperCase(),
                      )
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Contact person">
                  <input
                    name="contactPerson"
                    maxLength={160}
                    value={form.contactPerson}
                    onChange={(e) => update("contactPerson", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="WhatsApp number *" error={errors.phone}>
                  <input
                    name="phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) =>
                      update("phone", cleanPhone(e.target.value))
                    }
                    className={inputClass}
                    placeholder="9876543210"
                  />
                </Field>
                <Field label="Alternate phone" error={errors.alternatePhone}>
                  <input
                    name="alternatePhone"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.alternatePhone}
                    onChange={(e) =>
                      update("alternatePhone", cleanPhone(e.target.value))
                    }
                    className={inputClass}
                    placeholder="9876543210"
                  />
                </Field>
                <Field label="Address line 1">
                  <input
                    value={form.addressLine1}
                    maxLength={240}
                    onChange={(e) => update("addressLine1", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Address line 2">
                  <input
                    value={form.addressLine2}
                    maxLength={240}
                    onChange={(e) => update("addressLine2", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="City">
                  <input
                    value={form.city}
                    maxLength={100}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    value={form.state}
                    maxLength={100}
                    onChange={(e) => update("state", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Postal code">
                  <input
                    value={form.postalCode}
                    maxLength={20}
                    onChange={(e) => update("postalCode", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Notes">
                <textarea
                  rows={4}
                  maxLength={1500}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  className={`${inputClass} h-auto py-3`}
                />
              </Field>
              <ContactList
                empty="No vendors added yet."
                items={suppliers.map((supplier) => ({
                  id: supplier._id,
                  title: supplier.name,
                  subtitle: `${supplier.code} · ${supplier.phone || "No WhatsApp"} · ${supplier.isActive ? "Active" : "Inactive"}`,
                  active: supplier.isActive,
                  onToggle: () => void toggleVendor(supplier),
                  onDelete: () => onDeleteVendor(supplier),
                }))}
                saving={saving}
              />
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pickup person name *" error={errors.name}>
                  <input
                    name="name"
                    maxLength={120}
                    value={pickup.name}
                    onChange={(e) =>
                      setPickup((v) => ({ ...v, name: e.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="WhatsApp number *" error={errors.whatsappNumber}>
                  <input
                    name="whatsappNumber"
                    inputMode="numeric"
                    maxLength={10}
                    value={pickup.whatsappNumber}
                    onChange={(e) =>
                      setPickup((v) => ({
                        ...v,
                        whatsappNumber: cleanPhone(e.target.value),
                      }))
                    }
                    className={inputClass}
                    placeholder="9876543210"
                  />
                </Field>
              </div>
              <ContactList
                empty="No pickup people added yet."
                items={pickupPeople.map((person) => ({
                  id: person._id,
                  title: person.name,
                  subtitle: `${person.whatsappNumber} · ${person.isActive ? "Active" : "Inactive"}`,
                  active: person.isActive,
                  onToggle: () => void togglePickup(person),
                  onDelete: () => onDeletePickup(person),
                }))}
                saving={saving}
              />
            </>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#eee4dc] bg-white p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 rounded-xl border border-[#ded3ca] px-5 text-xs font-black text-[#173044]"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-xl bg-[#C8102E] px-5 text-xs font-black text-white disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : mode === "vendor"
                ? "Add vendor"
                : "Add pickup person"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function ContactList({
  empty,
  items,
  saving,
}: {
  empty: string;
  items: {
    id: string;
    title: string;
    subtitle: string;
    active: boolean;
    onToggle: () => void;
    onDelete: () => void;
  }[];
  saving: boolean;
}) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#756960]">
        Existing records
      </p>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-[#81756c]">{empty}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-[#e8ddd3] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-[#173044]">
                  {item.title}
                </p>
                <p className="mt-1 text-[10px] text-[#81756c]">
                  {item.subtitle}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={item.onToggle}
                  className="rounded-lg border border-[#ded3ca] px-3 py-2 text-[10px] font-black text-[#173044]"
                >
                  {item.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={item.onDelete}
                  className="rounded-lg border border-red-200 px-3 py-2 text-[10px] font-black text-red-700"
                >
                  <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Drawer({title,eyebrow,onClose,children}:{title:string;eyebrow:string;onClose:()=>void;children:React.ReactNode}){return <motion.div className="fixed inset-0 z-[100] flex items-end justify-end bg-black/45 backdrop-blur-[2px] sm:items-stretch" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><motion.aside initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:28,stiffness:260}} className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:h-full sm:max-w-3xl sm:rounded-none"><header className="flex items-start justify-between gap-4 border-b border-[#eee4dc] px-4 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C8102E]">{eyebrow}</p><h2 className="mt-1 truncate text-xl font-black text-[#173044]">{title}</h2></div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-[#e4d9d0] bg-white text-[#173044]"><FontAwesomeIcon icon={faXmark}/></button></header>{children}</motion.aside></motion.div>}
function Field({label,children,error}:{label:string;children:React.ReactNode;error?:string}){return <label className="block min-w-0"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-[#756960]">{label}</span>{children}{error&&<span className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}</label>}
function ValidationError({message}:{message:string}){return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</div>}
