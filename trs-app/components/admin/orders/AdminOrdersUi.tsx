"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import type { SortField, SortOrder } from "@/components/admin/orders/admin-orders.api";

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#8d8178]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#ded2c8] bg-white px-3 text-xs font-bold capitalize text-[#173044] outline-none focus:border-[#C8102E]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[#8d8178]">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#ded2c8] bg-white px-3 text-xs font-bold text-[#173044] outline-none focus:border-[#C8102E]"
      />
    </label>
  );
}
function SortableHead({
  label,
  field,
  current,
  direction,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  direction: SortOrder;
  onSort: (field: SortField) => void;
}) {
  return (
    <th className="px-5 py-4">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-2"
      >
        {label}
        {current === field && (
          <FontAwesomeIcon
            icon={direction === "asc" ? faArrowUp : faArrowDown}
            className="h-2.5"
          />
        )}
      </button>
    </th>
  );
}
function StatePanel({
  icon,
  title,
  message,
  action,
}: {
  icon: typeof faReceipt;
  title: string;
  message: string;
  action: () => void;
}) {
  return (
    <div className="grid min-h-80 place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0e8] text-[#C8102E]">
          <FontAwesomeIcon icon={icon} />
        </span>
        <h3 className="mt-4 text-base font-black text-[#173044]">{title}</h3>
        <p className="mt-2 max-w-md text-xs leading-5 text-[#83776e]">
          {message}
        </p>
        <button
          onClick={action}
          className="mt-4 rounded-xl bg-[#17384d] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
export function OrdersSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`animate-pulse space-y-3 p-5 ${compact ? "min-h-96" : "min-h-80"}`}
    >
      {Array.from({ length: compact ? 6 : 8 }).map((_, index) => (
        <div key={index} className="h-16 rounded-2xl bg-[#eee4dc]" />
      ))}
    </div>
  );
}
