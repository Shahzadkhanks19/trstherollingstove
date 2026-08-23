import "server-only";

import { revalidatePath } from "next/cache";

export function revalidatePublicMenuPaths(slugs: Array<string | null | undefined> = []): void {
  revalidatePath("/menu");
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/order-now");

  for (const slug of new Set(slugs.map((value) => value?.trim()).filter(Boolean))) {
    revalidatePath(`/menu/${slug}`);
  }
}
