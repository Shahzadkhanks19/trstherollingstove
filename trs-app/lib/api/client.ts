import type { ApiResponse } from "@/types/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  retryOnUnauthorized?: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function authenticatedFetch(
  input: string | URL | Request,
  init: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
  });

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    return response;
  }

  return authenticatedFetch(input, init, false);
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    body,
    retryOnUnauthorized = true,
    headers,
    ...requestInit
  } = options;

  const response = await authenticatedFetch(
    `${API_BASE_URL}${path}`,
    {
      ...requestInit,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    retryOnUnauthorized,
  );

  const payload = (await response.json().catch(() => ({
    success: false,
    message: "The server returned an invalid response.",
  }))) as ApiResponse<T>;

  if (!response.ok && payload.success) {
    return {
      success: false,
      message: "The request could not be completed.",
      code: `HTTP_${response.status}`,
    };
  }

  return payload;
}

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "GET",
    });
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "POST",
      body,
    });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body,
    });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body,
    });
  },

  delete<T>(path: string, options?: RequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "DELETE",
    });
  },
};
