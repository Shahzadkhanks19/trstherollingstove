export const CART_UPDATED_EVENT =
  "trs:cart-updated";

export const AUTH_UPDATED_EVENT =
  "trs:auth-updated";

export const GUEST_CART_KEY =
  "trs_guest_cart_v1";

export type CartModifier = {
  groupId?: string;
  optionId?: string;
  optionName?: string;
  unitPrice?: number;
};

export type CartApiItem = {
  _id: string;
  menuItemId?: string;
  variantId?: string | null;
  name: string;
  imageUrl?: string;
  variantName?: string;
  modifiers?: CartModifier[];
  quantity: number;
  baseUnitPrice?: number;
  lineUnitPrice: number;
  lineTotal: number;
  specialInstructions?: string;
};

export type CartApiData = {
  items: CartApiItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  itemCount: number;
};

export type GuestCartInput = {
  menuItemId: string;
  variantId?: string | null;
  name: string;
  imageUrl?: string;
  variantName?: string;
  baseUnitPrice: number;

  modifiers: Array<{
    groupId: string;
    optionId: string;
    optionName: string;
    unitPrice: number;
  }>;

  quantity: number;
  specialInstructions?: string;
};

type CurrentCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleKey: string;
};

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  error?: {
    message?: string;
  };
};

function emptyCart(): CartApiData {
  return {
    items: [],
    subtotal: 0,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: 0,
    itemCount: 0,
  };
}

function recalculateGuestCart(
  items: CartApiItem[],
): CartApiData {
  const normalized = items.map(
    (item) => ({
      ...item,
      quantity: Math.max(
        1,
        Math.min(50, item.quantity),
      ),
      lineTotal:
        Math.round(
          item.lineUnitPrice *
            Math.max(
              1,
              Math.min(
                50,
                item.quantity,
              ),
            ) *
            100,
        ) / 100,
    }),
  );

  const subtotal =
    Math.round(
      normalized.reduce(
        (sum, item) =>
          sum + item.lineTotal,
        0,
      ) * 100,
    ) / 100;

  return {
    items: normalized,
    subtotal,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: subtotal,
    itemCount: normalized.reduce(
      (sum, item) =>
        sum + item.quantity,
      0,
    ),
  };
}

export function publishCartUpdated(
  itemCount: number,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      CART_UPDATED_EVENT,
      {
        detail: {
          itemCount,
        },
      },
    ),
  );
}

export function publishAuthUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      AUTH_UPDATED_EVENT,
    ),
  );
}

export function readGuestCart(): CartApiData {
  if (typeof window === "undefined") {
    return emptyCart();
  }

  try {
    const raw =
      window.localStorage.getItem(
        GUEST_CART_KEY,
      );

    if (!raw) {
      return emptyCart();
    }

    const parsed =
      JSON.parse(
        raw,
      ) as Partial<CartApiData>;

    return recalculateGuestCart(
      Array.isArray(parsed.items)
        ? (parsed.items as CartApiItem[])
        : [],
    );
  } catch {
    return emptyCart();
  }
}

export function writeGuestCart(
  cart: CartApiData,
): CartApiData {
  if (typeof window === "undefined") {
    return cart;
  }

  const next =
    recalculateGuestCart(
      cart.items,
    );

  window.localStorage.setItem(
    GUEST_CART_KEY,
    JSON.stringify(next),
  );

  publishCartUpdated(
    next.itemCount,
  );

  return next;
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    GUEST_CART_KEY,
  );

  publishCartUpdated(0);
}

function guestLineKey(
  item: Pick<
    CartApiItem,
    | "menuItemId"
    | "variantId"
    | "modifiers"
    | "specialInstructions"
  >,
): string {
  const modifiers = (
    item.modifiers ?? []
  )
    .map(
      (modifier) =>
        `${modifier.groupId ?? ""}:${
          modifier.optionId ?? ""
        }`,
    )
    .sort()
    .join("|");

  return `${item.menuItemId ?? ""}::${
    item.variantId ?? ""
  }::${modifiers}::${
    item.specialInstructions ?? ""
  }`;
}

export function addGuestCartItem(
  input: GuestCartInput,
): CartApiData {
  const cart = readGuestCart();

  const lineUnitPrice =
    input.baseUnitPrice +
    input.modifiers.reduce(
      (sum, modifier) =>
        sum + modifier.unitPrice,
      0,
    );

  const candidate: CartApiItem = {
    _id: `guest-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,

    menuItemId: input.menuItemId,
    variantId:
      input.variantId ?? null,
    name: input.name,
    imageUrl: input.imageUrl,
    variantName: input.variantName,
    baseUnitPrice:
      input.baseUnitPrice,
    modifiers: input.modifiers,
    quantity: input.quantity,
    specialInstructions:
      input.specialInstructions ?? "",
    lineUnitPrice,
    lineTotal:
      lineUnitPrice *
      input.quantity,
  };

  const existing =
    cart.items.find(
      (item) =>
        guestLineKey(item) ===
        guestLineKey(candidate),
    );

  if (existing) {
    existing.quantity = Math.min(
      50,
      existing.quantity +
        input.quantity,
    );
  } else {
    cart.items.push(candidate);
  }

  return writeGuestCart(cart);
}

export function updateGuestCartItem(
  itemId: string,
  quantity: number,
): CartApiData {
  const cart = readGuestCart();

  const item = cart.items.find(
    (entry) =>
      entry._id === itemId,
  );

  if (item) {
    item.quantity = Math.max(
      1,
      Math.min(50, quantity),
    );
  }

  return writeGuestCart(cart);
}

export function removeGuestCartItem(
  itemId: string,
): CartApiData {
  const cart = readGuestCart();

  cart.items =
    cart.items.filter(
      (entry) =>
        entry._id !== itemId,
    );

  return writeGuestCart(cart);
}

async function requestCurrentCustomer(): Promise<Response> {
  return fetch(
    "/api/v1/auth/me",
    {
      cache: "no-store",
      credentials: "include",
    },
  );
}

async function refreshAuthentication(): Promise<boolean> {
  try {
    const response = await fetch(
      "/api/v1/auth/refresh",
      {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}

export async function getCurrentCustomerData(): Promise<CurrentCustomer | null> {
  let response =
    await requestCurrentCustomer();

  /*
   * The access token may have expired while
   * the refresh token is still valid.
   */
  if (
    response.status === 401
  ) {
    const refreshed =
      await refreshAuthentication();

    if (refreshed) {
      response =
        await requestCurrentCustomer();
    }
  }

  if (!response.ok) {
    return null;
  }

  const body =
    (await response.json()) as ApiEnvelope<CurrentCustomer>;

  if (
    !body.data ||
    body.data.roleKey !==
      "customer"
  ) {
    return null;
  }

  return body.data;
}

export async function getCurrentCustomer(): Promise<boolean> {
  return Boolean(
    await getCurrentCustomerData(),
  );
}

export async function fetchCustomerCart(): Promise<CartApiData> {
  let response = await fetch(
    "/api/v1/customer/cart",
    {
      cache: "no-store",
      credentials: "include",
    },
  );

  if (
    response.status === 401 &&
    (await refreshAuthentication())
  ) {
    response = await fetch(
      "/api/v1/customer/cart",
      {
        cache: "no-store",
        credentials: "include",
      },
    );
  }

  const body =
    (await response.json()) as ApiEnvelope<CartApiData>;

  if (
    !response.ok ||
    !body.data
  ) {
    throw new Error(
      body.error?.message ??
        body.message ??
        "Unable to load cart.",
    );
  }

  return body.data;
}

export async function fetchActiveCart(): Promise<{
  cart: CartApiData;
  authenticated: boolean;
}> {
  const customer =
    await getCurrentCustomerData();

  if (!customer) {
    return {
      cart: readGuestCart(),
      authenticated: false,
    };
  }

  try {
    return {
      cart:
        await fetchCustomerCart(),
      authenticated: true,
    };
  } catch (error) {
    /*
     * Do not make a temporary cart API failure
     * look like a logout. Keep the customer
     * authenticated and return an empty cart
     * only when the cart itself cannot load.
     */
    console.error(
      "Customer cart loading failed:",
      error,
    );

    return {
      cart: emptyCart(),
      authenticated: true,
    };
  }
}

export async function mergeGuestCart(): Promise<CartApiData | null> {
  const guest = readGuestCart();

  if (
    guest.items.length === 0
  ) {
    publishAuthUpdated();
    return null;
  }

  const response = await fetch(
    "/api/v1/customer/cart/merge",
    {
      method: "POST",
      credentials: "include",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        items: guest.items
          .filter(
            (item) =>
              Boolean(
                item.menuItemId,
              ),
          )
          .map((item) => ({
            menuItemId:
              item.menuItemId!,
            variantId:
              item.variantId ?? null,

            modifiers: (
              item.modifiers ?? []
            )
              .filter(
                (modifier) =>
                  Boolean(
                    modifier.groupId &&
                      modifier.optionId,
                  ),
              )
              .map(
                (modifier) => ({
                  groupId:
                    modifier.groupId!,
                  optionId:
                    modifier.optionId!,
                }),
              ),

            quantity:
              item.quantity,

            specialInstructions:
              item.specialInstructions ??
              "",
          })),
      }),
    },
  );

  const body =
    (await response.json()) as ApiEnvelope<CartApiData>;

  if (
    !response.ok ||
    !body.data
  ) {
    throw new Error(
      body.error?.message ??
        body.message ??
        "Unable to merge your saved cart.",
    );
  }

  clearGuestCart();

  publishCartUpdated(
    body.data.itemCount,
  );

  publishAuthUpdated();

  return body.data;
}

function convertCustomerCartToGuestCart(
  customerCart: CartApiData,
): CartApiData {
  const guestItems =
    customerCart.items
      .filter(
        (item) =>
          Boolean(item.menuItemId),
      )
      .map((item, index) => ({
        ...item,

        _id: `guest-${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2)}`,

        modifiers: (
          item.modifiers ?? []
        ).map((modifier) => ({
          ...modifier,
        })),
      }));

  return recalculateGuestCart(
    guestItems,
  );
}

export async function logoutCustomerPreservingCart(): Promise<void> {
  let cartSnapshot: CartApiData | null =
    null;

  try {
    cartSnapshot =
      await fetchCustomerCart();
  } catch (error) {
    console.error(
      "Unable to snapshot customer cart before logout:",
      error,
    );
  }

  const response = await fetch(
    "/api/v1/auth/logout",
    {
      method: "POST",
      credentials: "include",
    },
  );

  const body =
    (await response
      .json()
      .catch(
        () => null,
      )) as ApiEnvelope<null> | null;

  if (!response.ok) {
    throw new Error(
      body?.error?.message ??
        body?.message ??
        "Unable to log out.",
    );
  }

  if (cartSnapshot) {
    writeGuestCart(
      convertCustomerCartToGuestCart(
        cartSnapshot,
      ),
    );
  } else {
    publishCartUpdated(
      readGuestCart().itemCount,
    );
  }

  publishAuthUpdated();
}