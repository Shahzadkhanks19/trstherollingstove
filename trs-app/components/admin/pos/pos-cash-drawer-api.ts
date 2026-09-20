import type { Register, Shift } from "@/components/admin/pos/PosCashDrawerLedger";

type ApiErrorDetail = { field?: string; path?: string; message?: string };
type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: ApiErrorDetail[];
};

function apiErrorMessage<T>(response: ApiResponse<T>, fallback: string) {
  const details = response.errors
    ?.map(
      (error) =>
        `${error.field || error.path ? `${error.field || error.path}: ` : ""}${error.message || "Invalid value."}`,
    )
    .filter(Boolean);

  return details?.length ? details.join(" · ") : response.message || fallback;
}

export async function fetchCashDrawerData() {
  const [shiftResponse, registersResponse, historyResponse] = await Promise.all([
    fetch("/api/v1/pos/shifts/current?mine=true", {
      cache: "no-store",
      credentials: "include",
    }),
    fetch("/api/v1/admin/pos/registers", {
      cache: "no-store",
      credentials: "include",
    }),
    fetch("/api/v1/pos/shifts/history", {
      cache: "no-store",
      credentials: "include",
    }),
  ]);

  const shiftJson = (await shiftResponse.json()) as ApiResponse<Shift | null>;
  const registersJson = (await registersResponse.json()) as ApiResponse<Register[]>;
  const historyJson = (await historyResponse.json()) as ApiResponse<Shift[]>;

  if (!shiftResponse.ok) {
    throw new Error(
      apiErrorMessage(shiftJson, "Unable to load the current cash drawer."),
    );
  }
  if (!registersResponse.ok) {
    throw new Error(
      apiErrorMessage(registersJson, "Unable to load POS registers."),
    );
  }
  if (!historyResponse.ok) {
    throw new Error(
      apiErrorMessage(historyJson, "Unable to load today's cash activity."),
    );
  }

  const registers = registersJson.data.filter((register) => register.isActive);
  const shifts = historyJson.data ?? [];
  const shift = shiftJson.data
    ? shifts.find((item) => item._id === shiftJson.data?._id) ?? shiftJson.data
    : null;

  return { shift, shifts, registers };
}

export async function openCashDrawerShift(
  registerId: string,
  openingCash: number,
) {
  const response = await fetch("/api/v1/pos/shifts/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ registerId, openingCash }),
  });
  const json = (await response.json()) as ApiResponse<Shift>;

  if (!response.ok) {
    throw new Error(apiErrorMessage(json, "Unable to open the POS shift."));
  }
}

export async function recordCashDrawerMovement(
  shiftId: string,
  type: "cash_in" | "cash_out",
  amount: number,
  reason: string,
) {
  const response = await fetch(
    `/api/v1/pos/shifts/${shiftId}/cash-movements`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type, amount, reason }),
    },
  );
  const json = (await response.json()) as ApiResponse<{ expectedCash: number }>;

  if (!response.ok) {
    throw new Error(
      apiErrorMessage(
        json,
        type === "cash_in"
          ? "Unable to add cash to the drawer."
          : "Unable to remove cash from the drawer.",
      ),
    );
  }
}

export async function closeCashDrawerShift(
  shiftId: string,
  input: {
    countedCash: number;
    closingNote: string;
    closeApprovalNote: string;
  },
) {
  const response = await fetch(`/api/v1/pos/shifts/${shiftId}/close`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as ApiResponse<Shift>;

  if (!response.ok) {
    throw new Error(
      apiErrorMessage(json, "Unable to close the register shift."),
    );
  }
}
