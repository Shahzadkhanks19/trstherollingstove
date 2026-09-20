"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Register, Shift } from "@/components/admin/pos/PosCashDrawerLedger";
import {
  closeCashDrawerShift,
  fetchCashDrawerData,
  openCashDrawerShift,
  recordCashDrawerMovement,
} from "@/components/admin/pos/pos-cash-drawer-api";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function usePosCashDrawer() {
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [cashToAdd, setCashToAdd] = useState("");
  const [cashInReason, setCashInReason] = useState(
    "Opening/change cash added before sales",
  );
  const [cashToRemove, setCashToRemove] = useState("");
  const [cashOutReason, setCashOutReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [closeApprovalNote, setCloseApprovalNote] = useState("");
  const [message, setMessage] = useState("");

  const loadDrawer = useCallback(async () => {
    const data = await fetchCashDrawerData();
    setShift(data.shift);
    setTodayShifts(data.shifts);
    setRegisters(data.registers);
    setRegisterId((current) => current || data.registers[0]?._id || "");
  }, []);

  const closedToday = useMemo(
    () => todayShifts.filter((item) => item.status === "closed"),
    [todayShifts],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDrawer().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDrawer]);

  useEffect(() => {
    const refresh = () => {
      void loadDrawer().catch(() => undefined);
    };
    window.addEventListener("trs:pos-cash-drawer-changed", refresh);
    return () =>
      window.removeEventListener("trs:pos-cash-drawer-changed", refresh);
  }, [loadDrawer]);

  async function refreshDrawer() {
    setLoading(true);
    setMessage("");
    try {
      await loadDrawer();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to refresh the cash drawer.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openShift() {
    const amount = Math.round(Number(openingCash || 0));
    if (!registerId || !Number.isFinite(amount) || amount < 0) {
      setMessage("Select a register and enter a valid opening cash amount.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await openCashDrawerShift(registerId, amount);
      await loadDrawer();
      setMessage(`Shift opened with ${money.format(amount)}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to open the POS shift.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function addCash() {
    if (!shift) return;
    const amount = Math.round(Number(cashToAdd || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid opening/change cash amount.");
      return;
    }
    if (cashInReason.trim().length < 2) {
      setMessage("Enter why cash is being added.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await recordCashDrawerMovement(
        shift._id,
        "cash_in",
        amount,
        cashInReason.trim(),
      );
      setCashToAdd("");
      setMessage(`${money.format(amount)} added to today's drawer.`);
      await loadDrawer();
      window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add cash to the drawer.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeCash() {
    if (!shift) return;
    const amount = Math.round(Number(cashToRemove || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid cash-out amount.");
      return;
    }
    if (amount > Math.round(shift.expectedCash ?? 0)) {
      setMessage("Cash out cannot exceed the expected drawer balance.");
      return;
    }
    if (cashOutReason.trim().length < 2) {
      setMessage("Enter why cash is being removed.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await recordCashDrawerMovement(
        shift._id,
        "cash_out",
        amount,
        cashOutReason.trim(),
      );
      setCashToRemove("");
      setCashOutReason("");
      setMessage(`${money.format(amount)} removed from today's drawer.`);
      await loadDrawer();
      window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to remove cash from the drawer.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function closeShift() {
    if (!shift) return;
    const counted = Math.round(Number(countedCash || 0));
    if (!Number.isFinite(counted) || counted < 0) {
      setMessage("Enter the physically counted cash.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await closeCashDrawerShift(shift._id, {
        countedCash: counted,
        closingNote: closingNote.trim(),
        closeApprovalNote: closeApprovalNote.trim(),
      });
      const difference = counted - Math.round(shift.expectedCash ?? 0);
      setCountedCash("");
      setClosingNote("");
      setCloseApprovalNote("");
      await loadDrawer();
      setMessage(
        `Register closed. Counted ${money.format(counted)} · Difference ${difference >= 0 ? "+" : ""}${money.format(difference)}. The complete cash ledger remains below.`,
      );
      window.dispatchEvent(new Event("trs:pos-cash-drawer-changed"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to close the register shift.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    shift,
    registers,
    registerId,
    setRegisterId,
    openingCash,
    setOpeningCash,
    cashToAdd,
    setCashToAdd,
    cashInReason,
    setCashInReason,
    cashToRemove,
    setCashToRemove,
    cashOutReason,
    setCashOutReason,
    countedCash,
    setCountedCash,
    closingNote,
    setClosingNote,
    closeApprovalNote,
    setCloseApprovalNote,
    message,
    closedToday,
    refreshDrawer,
    openShift,
    addCash,
    removeCash,
    closeShift,
  };
}
