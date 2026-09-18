"use client";

import { useEffect, useState } from "react";
import type { PosInternalConsumption, PosSaleType } from "@/types/pos";

type ApiResponse<T> = { success: boolean; message: string; data: T };

type InternalStaffOption = {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  dailyMealLimit?: number;
  monthlyMealLimit?: number;
  requireManagerApprovalOnLimit?: boolean;
};
type InternalFamilyOption = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
};
type InternalReasonOption = { id: string; name: string };
type InternalOptions = {
  staff: InternalStaffOption[];
  family: InternalFamilyOption[];
  reasons: Partial<Record<PosSaleType, InternalReasonOption[]>>;
};

const INTERNAL_ORDER_LABELS: Record<PosSaleType, string> = {
  customer: "Customer order",
  staff_meal: "Staff meal",
  family_meal: "Family meal",
  complimentary: "Complimentary",
  food_wastage: "Food wastage",
  kitchen_test: "Kitchen testing",
};

export function InternalConsumptionPanel({
  value,
  onChange,
}: {
  value: PosInternalConsumption;
  onChange: (value: PosInternalConsumption) => void;
}) {
  const [options, setOptions] = useState<InternalOptions>({
    staff: [],
    family: [],
    reasons: {},
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (value.saleType === "customer" || loaded) return;
    const controller = new AbortController();
    void fetch("/api/v1/pos/internal-consumption/options", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as ApiResponse<InternalOptions>;
        if (!response.ok) throw new Error(json.message);
        setOptions(json.data);
        setLoaded(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [loaded, value.saleType]);

  function changeSaleType(saleType: PosSaleType) {
    onChange({
      saleType,
      referenceId: null,
      personName: "",
      reason: "",
      notes: "",
      managerApprovalEmail: "",
      managerApprovalPassword: "",
      managerApprovalReason: "",
    });
  }

  const availableReasons = options.reasons[value.saleType] ?? [];

  return (
    <div className="mb-4 rounded-2xl border border-[#e5d9cf] bg-[#fffdf9] p-3">
      <p className="mb-3 text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">
        Order classification
      </p>
      <label className="block text-[10px] font-black text-[#756960]">
        Order type
        <select
          value={value.saleType}
          onChange={(event) =>
            changeSaleType(event.currentTarget.value as PosSaleType)
          }
          className="mt-1 h-10 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c] outline-none focus:border-[#C8102E]"
        >
          {(Object.keys(INTERNAL_ORDER_LABELS) as PosSaleType[]).map(
            (saleType) => (
              <option key={saleType} value={saleType}>
                {INTERNAL_ORDER_LABELS[saleType]}
              </option>
            ),
          )}
        </select>
      </label>
      {value.saleType !== "customer" ? (
        <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <p className="text-[10px] font-black leading-4 text-amber-900">
            No payment, coupon, TRS Coin redemption, or loyalty credit.
            Inventory and kitchen processing remain active.
          </p>
          {value.saleType === "staff_meal" ? (
            <label className="block text-[10px] font-black text-[#756960]">
              Staff member *
              <select
                value={value.referenceId ?? ""}
                onChange={(event) => {
                  const selected = options.staff.find(
                    (entry) => entry.id === event.currentTarget.value,
                  );
                  onChange({
                    ...value,
                    referenceId: selected?.id ?? null,
                    personName: selected?.name ?? "",
                  });
                }}
                className="mt-1 h-10 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c] outline-none focus:border-[#C8102E]"
              >
                <option value="">Select eligible staff member</option>
                {options.staff.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {entry.employeeCode ? ` · ${entry.employeeCode}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : value.saleType === "family_meal" && options.family.length ? (
            <label className="block text-[10px] font-black text-[#756960]">
              Family member *
              <select
                value={value.referenceId ?? ""}
                onChange={(event) => {
                  const selected = options.family.find(
                    (entry) => entry.id === event.currentTarget.value,
                  );
                  onChange({
                    ...value,
                    referenceId: selected?.id ?? null,
                    personName: selected?.name ?? "",
                  });
                }}
                className="mt-1 h-10 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-black text-[#122b3c] outline-none focus:border-[#C8102E]"
              >
                <option value="">Select family member</option>
                {options.family.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {entry.relationship ? ` · ${entry.relationship}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-[10px] font-black text-[#756960]">
              {value.saleType === "family_meal"
                ? "Family member name *"
                : value.saleType === "food_wastage"
                  ? "Recorded by / item owner *"
                  : value.saleType === "kitchen_test"
                    ? "Chef / tester name *"
                    : "Recipient name *"}
              <input
                value={value.personName}
                onChange={(event) =>
                  onChange({
                    ...value,
                    referenceId: null,
                    personName: event.currentTarget.value,
                  })
                }
                maxLength={120}
                className="mt-1 h-10 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
              />
            </label>
          )}
          <label className="block text-[10px] font-black text-[#756960]">
            Reason *
            {availableReasons.length ? (
              <select
                value={value.reason}
                onChange={(event) =>
                  onChange({ ...value, reason: event.currentTarget.value })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
              >
                <option value="">Select reason</option>
                {availableReasons.map((reason) => (
                  <option key={reason.id} value={reason.name}>
                    {reason.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={value.reason}
                onChange={(event) =>
                  onChange({ ...value, reason: event.currentTarget.value })
                }
                maxLength={240}
                placeholder="Lunch, dinner, VIP guest, burnt item, recipe test..."
                className="mt-1 h-10 w-full rounded-xl border border-[#e5d9cf] bg-white px-3 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
              />
            )}
          </label>
          <label className="block text-[10px] font-black text-[#756960]">
            Internal notes
            <textarea
              value={value.notes}
              onChange={(event) =>
                onChange({ ...value, notes: event.currentTarget.value })
              }
              maxLength={500}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-xs font-semibold text-[#122b3c] outline-none focus:border-[#C8102E]"
            />
          </label>
          {value.saleType === "staff_meal" ? (
            <details className="rounded-xl border border-amber-300 bg-white p-3">
              <summary className="cursor-pointer text-[10px] font-black text-amber-900">
                Manager approval override (required only after meal limit)
              </summary>
              <div className="mt-3 space-y-2">
                <input
                  type="email"
                  autoComplete="username"
                  value={value.managerApprovalEmail}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      managerApprovalEmail: event.currentTarget.value,
                    })
                  }
                  placeholder="Manager email"
                  className="h-10 w-full rounded-xl border px-3 text-xs"
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={value.managerApprovalPassword}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      managerApprovalPassword: event.currentTarget.value,
                    })
                  }
                  placeholder="Manager password"
                  className="h-10 w-full rounded-xl border px-3 text-xs"
                />
                <textarea
                  value={value.managerApprovalReason}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      managerApprovalReason: event.currentTarget.value,
                    })
                  }
                  placeholder="Approval reason"
                  rows={2}
                  className="w-full rounded-xl border px-3 py-2 text-xs"
                />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

