import { getMenuItems } from "@/lib/menu-api";
import { MenuGridApiExample } from "@/components/menu/MenuGridApiExample";

export default async function ApiDrivenMenuPageExample() {
  const data = await getMenuItems();

  return (
    <main className="bg-[#FFFDF9] py-10 text-[#172536]">
      <div className="mx-auto w-[min(100%-2rem,1320px)]">
        <h1 className="text-4xl font-black uppercase">Menu</h1>

        <p className="mt-3 text-sm text-[#655E57]">
          All items, prices, availability and customisations are loaded from
          the backend and managed through the admin dashboard.
        </p>

        <div className="mt-8">
          <MenuGridApiExample items={data.items} />
        </div>
      </div>
    </main>
  );
}
