"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faFloppyDisk, faTrash, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";

type VariantPrice = { variantLabel: string; price: number };
type Option = { _id?: string; name: string; price: number; variantPrices: VariantPrice[]; isDefault: boolean; isActive: boolean; isAvailable: boolean; maxQuantity: number; sortOrder: number };
type Group = { _id: string; name: string; internalName: string; selectionType: "single" | "multiple" | "quantity"; isRequired: boolean; minSelections: number; maxSelections: number; options: Option[]; isActive: boolean; sortOrder: number };
type ApiResponse<T> = { success: boolean; message: string; data: T };
type Form = Omit<Group, "_id" | "options"> & { optionsText: string };

const emptyForm: Form = { name: "", internalName: "", selectionType: "multiple", isRequired: false, minSelections: 0, maxSelections: 5, optionsText: "", isActive: true, sortOrder: 0 };
const presets: Array<Omit<Group, "_id">> = [
  { name: "Pizza Extra Cheese", internalName: "pizza_extra_cheese", selectionType: "quantity", isRequired: false, minSelections: 0, maxSelections: 3, isActive: true, sortOrder: 10, options: [{ name: "Extra Cheese", price: 0, variantPrices: [{ variantLabel: "Regular", price: 0 }, { variantLabel: "Medium", price: 0 }, { variantLabel: "Large", price: 0 }], isDefault: false, isActive: true, isAvailable: true, maxQuantity: 3, sortOrder: 0 }] },
  { name: "Pizza Extra Topping", internalName: "pizza_extra_toppings", selectionType: "quantity", isRequired: false, minSelections: 0, maxSelections: 3, isActive: true, sortOrder: 20, options: [{ name: "Extra Topping", price: 0, variantPrices: [{ variantLabel: "Regular", price: 0 }, { variantLabel: "Medium", price: 0 }, { variantLabel: "Large", price: 0 }], isDefault: false, isActive: true, isAvailable: true, maxQuantity: 3, sortOrder: 0 }] },
  { name: "Garlic Bread Extra Cheese", internalName: "garlic_bread_extra_cheese", selectionType: "quantity", isRequired: false, minSelections: 0, maxSelections: 3, isActive: true, sortOrder: 30, options: [{ name: "Extra Cheese", price: 0, variantPrices: [], isDefault: false, isActive: true, isAvailable: true, maxQuantity: 3, sortOrder: 0 }] },
  { name: "Garlic Bread Extra Topping", internalName: "garlic_bread_extra_toppings", selectionType: "quantity", isRequired: false, minSelections: 0, maxSelections: 3, isActive: true, sortOrder: 40, options: [{ name: "Extra Topping", price: 0, variantPrices: [], isDefault: false, isActive: true, isAvailable: true, maxQuantity: 3, sortOrder: 0 }] },
  { name: "Dips", internalName: "dips", selectionType: "quantity", isRequired: false, minSelections: 0, maxSelections: 8, isActive: true, sortOrder: 30, options: [] },
  { name: "Choose Second Sabji", internalName: "sabji_choice", selectionType: "single", isRequired: true, minSelections: 1, maxSelections: 1, isActive: true, sortOrder: 10, options: [{ name: "Chole", price: 0, variantPrices: [], isDefault: true, isActive: true, isAvailable: true, maxQuantity: 1, sortOrder: 0 }, { name: "Paneer", price: 0, variantPrices: [], isDefault: false, isActive: true, isAvailable: true, maxQuantity: 1, sortOrder: 1 }] },
  { name: "Choose Portion", internalName: "portion_half_full", selectionType: "single", isRequired: true, minSelections: 1, maxSelections: 1, isActive: true, sortOrder: 20, options: [{ name: "Half Plate · 1 Naan", price: 0, variantPrices: [], isDefault: true, isActive: true, isAvailable: true, maxQuantity: 1, sortOrder: 0 }, { name: "Full Plate · 2 Naans", price: 0, variantPrices: [], isDefault: false, isActive: true, isAvailable: true, maxQuantity: 1, sortOrder: 1 }] },
  { name: "Extra Naan", internalName: "extra_naan", selectionType: "quantity", isRequired: false, minSelections: 0, maxSelections: 5, isActive: true, sortOrder: 30, options: [] },
];

function variantPricesToText(prices: VariantPrice[]): string {
  return prices.map((entry) => `${entry.variantLabel}=${entry.price}`).join(";");
}

function optionsToText(options: Option[]): string {
  return options
    .map((option) =>
      [
        option.name,
        option.price,
        option.maxQuantity,
        variantPricesToText(option.variantPrices ?? []),
      ].join("|"),
    )
    .join("\n");
}

function parseVariantPrices(value: string): VariantPrice[] {
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [variantLabel, price = "0"] = entry.split("=").map((part) => part.trim());
      return { variantLabel, price: Number(price || 0) };
    })
    .filter((entry) => entry.variantLabel.length > 0 && Number.isFinite(entry.price));
}

function parseOptions(text: string): Option[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, price = "0", max = "1", variantPrices = ""] = line
        .split("|")
        .map((value) => value.trim());

      return {
        name,
        price: Number(price || 0),
        variantPrices: parseVariantPrices(variantPrices),
        maxQuantity: Math.max(1, Number(max || 1)),
        isDefault: false,
        isActive: true,
        isAvailable: true,
        sortOrder: index,
      };
    });
}


export function AdminModifierGroupsClient({ canCreate, canUpdate, canDelete }: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const [groups, setGroups] = useState<Group[]>([]); const [form, setForm] = useState<Form>(emptyForm); const [editingId, setEditingId] = useState<string | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const load = useCallback(async () => { const response = await fetch("/api/v1/admin/menu/modifier-groups", { cache: "no-store" }); const payload = await response.json() as ApiResponse<Group[]>; if (!response.ok || !payload.success) throw new Error(payload.message); setGroups(payload.data); }, []);
  useEffect(() => {
    let cancelled = false;

    void fetch("/api/v1/admin/menu/modifier-groups", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<Group[]>;
        if (!response.ok || !payload.success) {
          throw new Error(payload.message);
        }

        if (!cancelled) {
          setGroups(payload.data);
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load groups.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const existingNames = useMemo(() => new Set(groups.map((g) => g.internalName)), [groups]);
  async function save(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const body = { ...form, options: parseOptions(form.optionsText) }; delete (body as Partial<Form>).optionsText; const response = await fetch(editingId ? `/api/v1/admin/menu/modifier-groups/${editingId}` : "/api/v1/admin/menu/modifier-groups", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json() as ApiResponse<Group>; if (!response.ok || !payload.success) throw new Error(payload.message); setMessage(payload.message); setEditingId(null); setForm(emptyForm); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save group."); } finally { setBusy(false); } }
  async function installPresets() { setBusy(true); setError(""); try { for (const preset of presets.filter((p) => !existingNames.has(p.internalName))) { const response = await fetch("/api/v1/admin/menu/modifier-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preset) }); const payload = await response.json() as ApiResponse<Group>; if (!response.ok || !payload.success) throw new Error(payload.message); } setMessage("TRS add-on presets installed. Configure pizza size prices and separate Garlic Bread fixed prices, then attach the correct groups to menu items."); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to install presets."); } finally { setBusy(false); } }
  async function remove(id: string) { setBusy(true); setError(""); try { const response = await fetch(`/api/v1/admin/menu/modifier-groups/${id}`, { method: "DELETE" }); const payload = await response.json() as ApiResponse<null>; if (!response.ok || !payload.success) throw new Error(payload.message); setMessage(payload.message); setDeleteTarget(null); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to delete group."); } finally { setBusy(false); } }
  function edit(group: Group) { setEditingId(group._id); setForm({ name: group.name, internalName: group.internalName, selectionType: group.selectionType, isRequired: group.isRequired, minSelections: group.minSelections, maxSelections: group.maxSelections, optionsText: optionsToText(group.options), isActive: group.isActive, sortOrder: group.sortOrder }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <div><PageHeader eyebrow="Menu customisation" title="Add-ons & Choice Groups" description="Create reusable Zomato-style customisation groups, then attach them to menu items." action={<div className="flex gap-2"><Link href="/admin/menu" className="inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-xs font-black"><FontAwesomeIcon icon={faArrowLeft}/>Menu</Link>{canCreate && <button disabled={busy} onClick={installPresets} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#122b3c] px-4 text-xs font-black text-white"><FontAwesomeIcon icon={faWandMagicSparkles}/>Install TRS presets</button>}</div>} />{message && <p className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}{error && <p className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}<div className="grid gap-5 xl:grid-cols-[420px_1fr]"><form onSubmit={save} className="space-y-4 rounded-[24px] border bg-[#fffdf9] p-5"><h2 className="text-lg font-black">{editingId ? "Edit group" : "Create group"}</h2><Field label="Customer-facing name"><input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="field" placeholder="Extra Cheese"/></Field><Field label="Internal key"><input required value={form.internalName} onChange={(e)=>setForm({...form,internalName:e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,"_")})} className="field" placeholder="extra_cheese"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Selection type"><select value={form.selectionType} onChange={(e)=>setForm({...form,selectionType:e.target.value as Form["selectionType"]})} className="field"><option value="single">Single</option><option value="multiple">Multiple</option><option value="quantity">Quantity</option></select></Field><Field label="Display order"><input type="number" value={form.sortOrder} onChange={(e)=>setForm({...form,sortOrder:Number(e.target.value)})} className="field"/></Field><Field label="Minimum"><input type="number" min="0" value={form.minSelections} onChange={(e)=>setForm({...form,minSelections:Number(e.target.value)})} className="field"/></Field><Field label="Maximum"><input type="number" min="1" value={form.maxSelections} onChange={(e)=>setForm({...form,maxSelections:Number(e.target.value)})} className="field"/></Field></div><label className="flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={form.isRequired} onChange={(e)=>setForm({...form,isRequired:e.target.checked})}/>Required selection</label><Field label="Options · Name | Fixed price | Max qty | Size prices"><textarea required value={form.optionsText} onChange={(e)=>setForm({...form,optionsText:e.target.value})} className="field min-h-48 py-3" placeholder={'Extra Cheese|0|3|Regular=40;Medium=60;Large=80\nExtra Topping|0|3|Regular=25;Medium=35;Large=45\nGarlic Bread Extra Cheese|35|3|'} /><p className="mt-2 text-[10px] font-semibold leading-4 text-[#81746b]">Pizza groups: set Regular, Medium and Large prices in the fourth column. Garlic Bread groups: leave the fourth column empty and set its independent fixed price in the second column. Attach Pizza groups only to pizzas and Garlic Bread groups only to garlic breads.</p></Field><div className="flex gap-2"><button disabled={busy || (!editingId && !canCreate) || (Boolean(editingId) && !canUpdate)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C8102E] px-4 text-xs font-black text-white disabled:opacity-50"><FontAwesomeIcon icon={faFloppyDisk}/>{busy ? "Saving…" : "Save group"}</button>{editingId && <button type="button" onClick={()=>{setEditingId(null);setForm(emptyForm)}} className="rounded-2xl border px-4 text-xs font-black">Cancel</button>}</div></form><section className="space-y-3">{groups.map((group)=><article key={group._id} className="rounded-[22px] border bg-white p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black">{group.name}</h3><p className="mt-1 text-xs text-slate-500">{group.internalName} · {group.selectionType} · {group.isRequired ? "Required" : "Optional"}</p></div><div className="flex gap-2">{canUpdate&&<button onClick={()=>edit(group)} className="rounded-xl border px-3 py-2 text-xs font-black">Edit</button>}{canDelete&&<button onClick={()=>setDeleteTarget(group)} className="rounded-xl border border-red-100 px-3 py-2 text-red-600"><FontAwesomeIcon icon={faTrash}/></button>}</div></div><div className="mt-3 flex flex-wrap gap-2">{group.options.map((option)=><span key={option._id ?? option.name} className="rounded-full bg-[#fff3ec] px-3 py-1.5 text-[10px] font-bold">{option.name}{option.variantPrices?.length ? ` · ${option.variantPrices.map((entry) => `${entry.variantLabel} ₹${entry.price}`).join(" / ")}` : option.price > 0 ? ` +₹${option.price}` : ""}</span>)}</div></article>)}</section></div><style jsx global>{`.field{width:100%;min-height:44px;border:1px solid #e5d9cf;border-radius:14px;background:#fff;padding:0 12px;font-size:13px;font-weight:600;outline:none}.field:focus{border-color:#C8102E;box-shadow:0 0 0 3px rgba(200,16,46,.08)}`}</style><CustomActionModal open={Boolean(deleteTarget)} title="Delete add-on group?" description={deleteTarget ? `Delete ${deleteTarget.name}? The group must not be attached to any menu item. This action cannot be undone.` : ""} confirmLabel="Delete group" tone="danger" loading={busy} onClose={()=>{ if (!busy) setDeleteTarget(null); }} onConfirm={async()=>{ if (deleteTarget) await remove(deleteTarget._id); }} /></div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-[#81746b]">{label}</span>{children}</label>}
