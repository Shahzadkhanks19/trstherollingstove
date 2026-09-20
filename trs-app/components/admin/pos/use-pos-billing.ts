"use client";

import { useEffect, useMemo, useState } from "react";
import { calculatePosCartTotals } from "@/lib/pos/cart";
import { posCartActions } from "@/lib/pos/cart-store";
import {
  DEFAULT_POS_PRINT_SETTINGS,
  readPosPrintSettings,
} from "@/lib/pos/print-settings";
import { queuePosSale } from "@/lib/pos/sale-offline-queue";
import type { PosCartState } from "@/types/pos";
import {
  buildPosSalePayload,
  createPosSale,
  fetchPosBillingSetup,
  openPosBillingShift,
  type BillingRegister,
  type BillingShift,
} from "@/components/admin/pos/pos-billing-api";
import {
  openPosSalePrintWindow,
  routePosSalePrintJobs,
} from "@/components/admin/pos/pos-billing-print";
import {
  resolvePosBillingPayment,
  type PosBillingPaymentMethod,
  type PosBillingTipMethod,
} from "@/components/admin/pos/pos-billing-payment";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Input = {
  open: boolean;
  cart: PosCartState;
  onClose: () => void;
  onCompleted: (message: string) => void;
};

export function usePosBilling({
  open,
  cart,
  onClose,
  onCompleted,
}: Input) {
  const totals = useMemo(() => calculatePosCartTotals(cart), [cart]);
  const [shift, setShift] = useState<BillingShift | null>(null);
  const [registers, setRegisters] = useState<BillingRegister[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [paymentMethod, setPaymentMethod] =
    useState<PosBillingPaymentMethod>("cash");
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [waivedAmount, setWaivedAmount] = useState("");
  const [waivedReason, setWaivedReason] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipMethod, setTipMethod] = useState<PosBillingTipMethod>("none");
  const [orderTakerName, setOrderTakerName] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [upiReference, setUpiReference] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastInvoiceId, setLastInvoiceId] = useState("");
  const [upiConfirmOpen, setUpiConfirmOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState(
    DEFAULT_POS_PRINT_SETTINGS,
  );

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPrintSettings(readPosPrintSettings());
      try {
        const data = await fetchPosBillingSetup(controller.signal);
        setShift(data.shift);
        setRegisters(data.registers);
        if (!registerId && data.registers[0]?._id) {
          setRegisterId(data.registers[0]._id);
        }
        setCashReceived(String(totals.grandTotal));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load billing details.",
          );
        }
      }
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, registerId, totals.grandTotal]);

  async function openShift() {
    setLoading(true);
    setMessage("");
    try {
      const openedShift = await openPosBillingShift(
        registerId,
        Number(openingCash || 0),
      );
      setShift(openedShift);
      setMessage("Register shift opened.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to open shift.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function completeSale() {
    if (!shift) return;
    const isInternalOrder = cart.internalConsumption.saleType !== "customer";
    const payment = resolvePosBillingPayment({
      isInternalOrder,
      grandTotal: totals.grandTotal,
      paymentMethod,
      splitCash,
      splitUpi,
      waivedAmount,
      waivedReason,
      tipAmount,
      tipMethod,
      cashReceived,
      upiConfirmed: upiConfirmOpen,
    });

    if (!payment.ok) {
      if ("requiresUpiConfirmation" in payment) {
        setUpiConfirmOpen(true);
      } else {
        setMessage(payment.message);
      }
      return;
    }

    setUpiConfirmOpen(false);
    const clientOperationId = crypto.randomUUID();
    const salePayload = buildPosSalePayload({
      cart,
      shiftId: shift._id,
      paymentMethod,
      splitCash,
      splitUpi,
      waivedAmount,
      waivedReason,
      tipAmount,
      tipMethod,
      orderTakerName,
      cashReceived: String(payment.received),
      upiReference,
      tableNumber,
      clientOperationId,
    });
    const printWindow = openPosSalePrintWindow(printSettings);

    setLoading(true);
    setMessage("");
    try {
      const sale = await createPosSale(salePayload);
      setLastInvoiceId(sale.invoice._id);
      routePosSalePrintJobs(sale.invoice._id, printSettings, printWindow);
      posCartActions.clear();
      onCompleted(
        `${sale.order.orderNumber} completed${
          paymentMethod === "cash"
            ? ` · Change ${money.format(sale.order.changeDue)}`
            : ""
        }.`,
      );
      setMessage("Sale completed. Configured print jobs were opened in sequence.");
    } catch (error) {
      printWindow?.close();
      const networkFailure = error instanceof TypeError || !navigator.onLine;
      if (networkFailure) {
        queuePosSale(
          clientOperationId,
          salePayload,
          error instanceof Error ? error.message : "Network unavailable",
        );
        posCartActions.clear();
        onCompleted(
          "Connection unavailable: sale saved securely on this device and will sync automatically. Print it from Bill History after sync.",
        );
        onClose();
      } else {
        setMessage(
          error instanceof Error ? error.message : "Unable to complete sale.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    totals,
    shift,
    registers,
    registerId,
    setRegisterId,
    openingCash,
    setOpeningCash,
    paymentMethod,
    setPaymentMethod,
    splitCash,
    setSplitCash,
    splitUpi,
    setSplitUpi,
    waivedAmount,
    setWaivedAmount,
    waivedReason,
    setWaivedReason,
    tipAmount,
    setTipAmount,
    tipMethod,
    setTipMethod,
    orderTakerName,
    setOrderTakerName,
    cashReceived,
    setCashReceived,
    upiReference,
    setUpiReference,
    tableNumber,
    setTableNumber,
    loading,
    message,
    lastInvoiceId,
    upiConfirmOpen,
    setUpiConfirmOpen,
    printSettings,
    openShift,
    completeSale,
  };
}

export type PosBillingState = ReturnType<typeof usePosBilling>;
