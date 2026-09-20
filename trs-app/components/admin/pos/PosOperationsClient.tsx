"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PosOperationsModal,
  type OperationDialog,
} from "@/components/admin/pos/PosOperationsModal";
import { PosOperationsWorkspace } from "@/components/admin/pos/PosOperationsWorkspace";
import { usePosOperations } from "@/components/admin/pos/use-pos-operations";

export function PosOperationsClient({ canManage }: { canManage: boolean }) {
  const [operationDialog, setOperationDialog] = useState<OperationDialog>(null);
  const {
    tables,
    orders,
    selected,
    message,
    loading,
    load,
    setSelectedId,
    sendToKitchen,
    transfer,
    merge,
    split,
    voidItem,
    duplicateSelectedOrder,
    modifySelectedOrder,
    cancelSelectedOrder,
    settle,
    createTable,
  } = usePosOperations(canManage);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-red-700">
            POS Phase 4
          </p>
          <h1 className="text-3xl font-black text-slate-950">
            Tables & running orders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live floor, transfers, merge, split, kitchen send, void and
            settlement.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/pos"
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
          >
            New order
          </Link>
          {canManage && (
            <button
              onClick={() => setOperationDialog("create-table")}
              className="rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white"
            >
              Add table
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {message}
        </p>
      )}

      <PosOperationsWorkspace
        tables={tables}
        orders={orders}
        selected={selected}
        loading={loading}
        canManage={canManage}
        onRefresh={() => void load()}
        onSelectOrder={setSelectedId}
        onModify={modifySelectedOrder}
        onDuplicate={duplicateSelectedOrder}
        onSendToKitchen={() => void sendToKitchen()}
        onOpenTransfer={() => setOperationDialog("transfer")}
        onOpenMerge={() => setOperationDialog("merge")}
        onOpenSplit={() => setOperationDialog("split")}
        onOpenVoid={() => setOperationDialog("void")}
        onOpenCancel={() => setOperationDialog("cancel-order")}
        onOpenSettle={() => setOperationDialog("settle")}
      />

      <PosOperationsModal
        key={`${operationDialog ?? "closed"}-${selected?.id ?? "none"}`}
        type={operationDialog}
        selected={selected}
        tables={tables}
        orders={orders}
        onClose={() => setOperationDialog(null)}
        onTransfer={transfer}
        onMerge={merge}
        onSplit={split}
        onVoid={voidItem}
        onCancelOrder={cancelSelectedOrder}
        onSettle={settle}
        onCreateTable={createTable}
      />
    </section>
  );
}
