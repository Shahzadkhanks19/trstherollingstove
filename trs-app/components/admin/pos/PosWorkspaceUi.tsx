"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUtensils } from "@fortawesome/free-solid-svg-icons";
import type { PosCatalogItem, PosCategory } from "@/types/pos";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function CategoryRail({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: PosCategory[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryButton
          label="All Items"
          active={activeCategory === "all"}
          onClick={() => onSelect("all")}
        />
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            label={category.name}
            active={activeCategory === category.id}
            onClick={() => onSelect(category.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black transition ${
        active
          ? "bg-[#111820] text-white shadow-lg"
          : "border border-[#e5d9cf] bg-white text-[#6d625a] hover:border-[#C8102E]/40 hover:text-[#C8102E]"
      }`}
    >
      {label}
    </button>
  );
}

export function ProductCard({
  item,
  onAdd,
}: {
  item: PosCatalogItem;
  onAdd: (item: PosCatalogItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={!item.isAvailable}
      className="group overflow-hidden rounded-[22px] border border-[#e7dbd1] bg-[#fffdf9] text-left shadow-[0_8px_24px_rgba(30,35,40,.05)] transition hover:-translate-y-0.5 hover:border-[#C8102E]/35 hover:shadow-[0_14px_34px_rgba(30,35,40,.09)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#efe7df]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 220px"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <span className="grid h-full place-items-center text-2xl text-[#C8102E]/45">
            <FontAwesomeIcon icon={faUtensils} />
          </span>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {item.isBestseller && (
            <span className="rounded-full bg-[#E8A53A] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-[#111820]">
              Bestseller
            </span>
          )}
          {!item.isAvailable && (
            <span className="rounded-full bg-[#111820] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white">
              Unavailable
            </span>
          )}
        </div>
        <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-xl bg-[#C8102E] text-white shadow-lg">
          <FontAwesomeIcon icon={faPlus} className="h-3" />
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-[10px] font-black uppercase tracking-[.12em] text-[#9a8e85]">
          {item.categoryName}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#122b3c]">
          {item.name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-black text-[#C8102E]">
            {money.format(item.price)}
          </span>
          {item.compareAtPrice && item.compareAtPrice > item.price ? (
            <span className="text-[10px] font-bold text-[#a69990] line-through">
              {money.format(item.compareAtPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}


export function NumberField({
  label,
  value,
  onChange,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="text-[10px] font-black text-[#756960]">
      {label}
      <input
        type="number"
        min={0}
        max={max}
        step="0.01"
        disabled={disabled}
        value={value}
        onChange={(event) =>
          onChange(Math.max(0, Number(event.currentTarget.value) || 0))
        }
        className="mt-1 h-9 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E] disabled:cursor-not-allowed disabled:bg-[#f1ebe5] disabled:text-[#aa9e95]"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-[10px] font-black text-[#756960]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-1 h-9 w-full rounded-xl border border-[#e5d9cf] bg-white px-2 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${accent ? "text-emerald-700" : "text-[#7d7168]"}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="font-black">
        {value < 0 ? `−${money.format(Math.abs(value))}` : money.format(value)}
      </span>
    </div>
  );
}

