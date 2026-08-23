import { Types } from "mongoose";
import { POSOfflineOperation } from "@/models/POSOfflineOperation";
import { updateRunningOrder, transferRunningOrder, voidRunningItem, updateTable } from "@/services/pos-operations.service";
import type { z } from "zod";
import type { offlineSyncSchema } from "@/validators/pos-hardening";

type SyncInput = z.infer<typeof offlineSyncSchema>;

type SyncResult = {
  operationId: string;
  status: "completed" | "failed";
  replayed: boolean;
  result?: unknown;
  error?: string;
};

async function execute(operation: SyncInput["operations"][number], actorId: string) {
  switch (operation.operationType) {
    case "running_order.update":
      return updateRunningOrder(operation.entityId, operation.payload, actorId);
    case "running_order.transfer":
      return transferRunningOrder(operation.entityId, operation.payload.tableId, operation.payload.guestCount, actorId);
    case "running_order.void_item":
      return voidRunningItem(operation.entityId, operation.payload.lineId, operation.payload.quantity, operation.payload.reason, actorId);
    case "table.update":
      return updateTable(operation.entityId, operation.payload, actorId);
  }
}

export async function processOfflineSync(input: SyncInput, actorId: string): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const operation of input.operations) {
    const existing = await POSOfflineOperation.findOne({ operationId: operation.operationId }).lean();
    if (existing) {
      results.push({
        operationId: operation.operationId,
        status: existing.status === "completed" ? "completed" : "failed",
        replayed: true,
        result: existing.result,
        error: existing.errorMessage || undefined,
      });
      continue;
    }

    const ledger = await POSOfflineOperation.create({
      operationId: operation.operationId,
      deviceId: input.deviceId,
      actorId: new Types.ObjectId(actorId),
      operationType: operation.operationType,
      entityId: operation.entityId,
      payload: operation.payload,
      status: "processing",
      clientCreatedAt: operation.clientCreatedAt ? new Date(operation.clientCreatedAt) : null,
    });

    try {
      const value = await execute(operation, actorId);
      const compactResult = value && typeof value === "object" && "_id" in value
        ? { id: String((value as { _id: unknown })._id) }
        : value;
      ledger.status = "completed";
      ledger.result = compactResult;
      ledger.completedAt = new Date();
      await ledger.save();
      results.push({ operationId: operation.operationId, status: "completed", replayed: false, result: compactResult });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Offline operation failed.";
      ledger.status = "failed";
      ledger.errorMessage = message;
      ledger.completedAt = new Date();
      await ledger.save();
      results.push({ operationId: operation.operationId, status: "failed", replayed: false, error: message });
    }
  }
  return results;
}
