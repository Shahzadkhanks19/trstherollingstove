import type { MenuItemSummary } from "@/types/menu";
import { MenuItemCard } from "@/components/menu/MenuItemCard";

export function MenuGridApiExample({
  items,
}: {
  items: MenuItemSummary[];
}) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
