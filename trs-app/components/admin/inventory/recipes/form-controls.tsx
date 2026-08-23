"use client";

import type { ReactNode } from "react";

export function FieldShell({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-xs font-black text-[#173044]">
      <span>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] font-medium text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-xl border border-[#ded3ca] bg-white px-3 font-normal outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-red-50"
      />
    </FieldShell>
  );
}

export function NumberField({ label, value, onChange, min = 0, step = 0.001, hint }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: number; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.currentTarget.value) || 0)}
        className="mt-1 h-11 w-full rounded-xl border border-[#ded3ca] bg-white px-3 font-normal outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-red-50"
      />
    </FieldShell>
  );
}

export function SelectField({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-1 h-11 w-full rounded-xl border border-[#ded3ca] bg-white px-3 font-normal outline-none transition focus:border-[#C8102E] focus:ring-4 focus:ring-red-50"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value || "base"} value={option.value}>{option.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}
