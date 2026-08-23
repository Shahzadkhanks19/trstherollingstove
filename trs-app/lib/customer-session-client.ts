import {
  fetchCustomerCart,
  getCurrentCustomerData,
  readGuestCart,
  type CartApiData,
} from "@/lib/cart-client";

type CurrentCustomer = Awaited<ReturnType<typeof getCurrentCustomerData>>;

type ActiveCartResult = {
  cart: CartApiData;
  authenticated: boolean;
};

let customerPromise: Promise<CurrentCustomer> | null = null;
let customerCache: CurrentCustomer = null;
let customerCacheExpiresAt = 0;
let activeCartPromise: Promise<ActiveCartResult> | null = null;

const CUSTOMER_CACHE_TTL_MS = 15_000;

export function invalidateSharedCustomerSession(): void {
  customerPromise = null;
  customerCache = null;
  customerCacheExpiresAt = 0;
  activeCartPromise = null;
}

export function getSharedCurrentCustomerData(): Promise<CurrentCustomer> {
  if (Date.now() < customerCacheExpiresAt) {
    return Promise.resolve(customerCache);
  }

  if (!customerPromise) {
    customerPromise = getCurrentCustomerData()
      .then((customer) => {
        customerCache = customer;
        customerCacheExpiresAt = Date.now() + CUSTOMER_CACHE_TTL_MS;
        return customer;
      })
      .finally(() => {
        customerPromise = null;
      });
  }

  return customerPromise;
}

export function fetchSharedActiveCart(): Promise<ActiveCartResult> {
  if (!activeCartPromise) {
    activeCartPromise = getSharedCurrentCustomerData()
      .then(async (customer) => {
        if (!customer) {
          return {
            cart: readGuestCart(),
            authenticated: false,
          };
        }

        try {
          return {
            cart: await fetchCustomerCart(),
            authenticated: true,
          };
        } catch (error) {
          console.error("Customer cart loading failed:", error);
          return {
            cart: readGuestCart(),
            authenticated: true,
          };
        }
      })
      .finally(() => {
        activeCartPromise = null;
      });
  }

  return activeCartPromise;
}
