import type {
  MenuItemDetails,
  MenuItemResponse,
  MenuListResponse,
} from "@/types/menu";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

async function parseApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null;

  return (
    body?.message ??
    body?.error ??
    `Request failed with status ${response.status}`
  );
}

export async function getMenuItems(): Promise<MenuListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/menu`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const envelope = (await response.json()) as ApiEnvelope<
    Array<{ items: MenuListResponse["items"] }>
  >;

  return {
    items: envelope.data.flatMap((group) => group.items),
  };
}

export async function getMenuItemBySlug(
  slug: string,
): Promise<MenuItemDetails | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/menu/items/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const envelope = (await response.json()) as ApiEnvelope<MenuItemDetails>;
  const data: MenuItemResponse = { item: envelope.data };

  return data.item;
}
