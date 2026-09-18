"use client";

import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateLeft, faBagShopping, faChevronRight, faFolderOpen, faMinus, faPause, faPlus, faReceipt, faTableColumns, faTrash, faUtensils, faXmark } from "@fortawesome/free-solid-svg-icons";
import { InternalConsumptionPanel } from "@/components/admin/pos/InternalConsumptionPanel";
import { PosCustomerPanel } from "@/components/admin/pos/PosCustomerPanel";
import { NumberField, SelectField, SummaryRow } from "@/components/admin/pos/PosWorkspaceUi";
import type { PosCartAdjustments, PosCartLine, PosCartTotals, PosCustomer, PosDiscountType, PosInternalConsumption, PosOrderType, PosTaxMode } from "@/types/pos";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function CartPanel({
  cart,
  itemCount,
  totals,
  adjustments,
  defaultTaxRate,
  defaultTaxMode,
  orderType,
  orderNote,
  customer,
  internalConsumption,
  cashierName,
  onOrderTypeChange,
  onChangeQuantity,
  onSetQuantity,
  onRemove,
  onLineNoteChange,
  onOrderNoteChange,
  onCustomerChange,
  onInternalConsumptionChange,
  onAdjustmentsChange,
  onHold,
  onOpenHeld,
  heldCount,
  statusMessage,
  onBilling,
  onRunningOrder,
  runningOrderLabel,
  onClear,
}
