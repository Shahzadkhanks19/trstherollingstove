import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuItemDetailsClient } from "@/components/menu-item/MenuItemDetailsClient";
import { getPublicMenuItemBySlug } from "@/lib/menu-public-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicMenuItemBySlug(slug);

  if (!item) {
    return {
      title: "Menu Item Not Found",
    };
  }

  return {
    title: `${item.name}`,
    description:
      item.shortDescription ||
      item.description.slice(0, 155),
    openGraph: {
      title: `${item.name}`,
      description:
        item.shortDescription ||
        item.description.slice(0, 155),
      images: item.media[0]?.url ? [item.media[0].url] : undefined,
    },
  };
}

export default async function MenuItemPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicMenuItemBySlug(slug);

  if (!item || !item.isAvailable) notFound();

  return <MenuItemDetailsClient item={item} />;
}
