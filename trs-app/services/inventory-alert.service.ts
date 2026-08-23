import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import {
  InventoryAlertRule,
  type InventoryAlertRuleDocument,
} from "@/models/InventoryAlertRule";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";
import {
  createInventoryAdminNotifications,
  publishInventoryEnterpriseEvent,
  recordInventoryAudit,
} from "@/services/inventory-enterprise-events.service";

type Rule = InventoryAlertRuleDocument & {
  _id: unknown;
};

type Candidate = {
  inventoryItemId?: unknown;
  inventoryMovementId?: unknown;
  severity: "info" | "warning" | "critical";
  message: string;
  observedValue?: number | null;
  thresholdValue?: number | null;
  metadata?: Record<string, unknown>;
  discriminator?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function itemFilter(rule: Rule) {
  return {
    isActive: true,
    ...(rule.inventoryItemId
      ? { _id: rule.inventoryItemId }
      : {}),
  };
}

async function candidatesForRule(
  rule: Rule,
  now: Date,
): Promise<Candidate[]> {
  const threshold = Number(rule.threshold ?? 0);

  if (
    rule.type === "low_stock" ||
    rule.type === "reorder"
  ) {
    const items = await InventoryItem.find({
      ...itemFilter(rule),
      $expr: {
        $lte: ["$currentStock", "$reorderLevel"],
      },
    }).lean();

    return items.map((item) => ({
      inventoryItemId: item._id,
      severity:
        item.currentStock <= 0 ? "critical" : "warning",
      message: `${item.name} (${item.sku}) is at ${item.currentStock} ${item.unit}; reorder level is ${item.reorderLevel}.`,
      observedValue: item.currentStock,
      thresholdValue: item.reorderLevel,
      metadata: {
        sku: item.sku,
        unit: item.unit,
        category: item.category,
      },
    }));
  }

  if (rule.type === "negative_stock") {
    const items = await InventoryItem.find({
      ...itemFilter(rule),
      currentStock: { $lt: 0 },
    }).lean();

    return items.map((item) => ({
      inventoryItemId: item._id,
      severity: "critical",
      message: `${item.name} (${item.sku}) has negative stock: ${item.currentStock} ${item.unit}.`,
      observedValue: item.currentStock,
      thresholdValue: 0,
      metadata: { sku: item.sku, unit: item.unit },
    }));
  }

  if (rule.type === "overstock") {
    const items = await InventoryItem.find({
      ...itemFilter(rule),
      idealStockLevel: { $gt: 0 },
      $expr: {
        $gt: [
          "$currentStock",
          {
            $multiply: [
              "$idealStockLevel",
              threshold > 0 ? threshold : 1.5,
            ],
          },
        ],
      },
    }).lean();

    return items.map((item) => ({
      inventoryItemId: item._id,
      severity: "info",
      message: `${item.name} (${item.sku}) is above its configured overstock threshold.`,
      observedValue: item.currentStock,
      thresholdValue:
        item.idealStockLevel *
        (threshold > 0 ? threshold : 1.5),
      metadata: {
        sku: item.sku,
        unit: item.unit,
        idealStockLevel: item.idealStockLevel,
      },
    }));
  }

  if (
    rule.type === "near_expiry" ||
    rule.type === "expired"
  ) {
    const expiryBoundary =
      rule.type === "expired"
        ? now
        : new Date(
            now.getTime() +
              (threshold > 0 ? threshold : 7) * DAY_MS,
          );

    const movementFilter: Record<string, unknown> = {
      expiryDate:
        rule.type === "expired"
          ? { $lt: now }
          : { $gte: now, $lte: expiryBoundary },
      type: { $in: ["opening", "purchase", "return_in"] },
      ...(rule.inventoryItemId
        ? { inventoryItemId: rule.inventoryItemId }
        : {}),
    };

    const movements = await InventoryMovement.find(
      movementFilter,
    )
      .populate("inventoryItemId", "name sku unit")
      .lean();

    return movements.map((movement) => {
      const item = movement.inventoryItemId as unknown as {
        _id?: unknown;
        name?: string;
        sku?: string;
        unit?: string;
      };
      const expiryDate = movement.expiryDate as Date;
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / DAY_MS,
      );

      return {
        inventoryItemId: item?._id,
        inventoryMovementId: movement._id,
        severity:
          rule.type === "expired" ? "critical" : "warning",
        message:
          rule.type === "expired"
            ? `${item?.name ?? "Inventory batch"} (${item?.sku ?? "unknown SKU"}) expired on ${expiryDate.toISOString().slice(0, 10)}.`
            : `${item?.name ?? "Inventory batch"} (${item?.sku ?? "unknown SKU"}) expires in ${daysRemaining} day(s).`,
        observedValue: daysRemaining,
        thresholdValue:
          rule.type === "expired"
            ? 0
            : threshold > 0
              ? threshold
              : 7,
        discriminator: String(movement._id),
        metadata: {
          batchNumber: movement.batchNumber,
          expiryDate,
          quantity: movement.quantity,
          unit: item?.unit,
        },
      };
    });
  }

  if (
    rule.type === "slow_moving" ||
    rule.type === "dead_stock"
  ) {
    const days =
      threshold > 0
        ? threshold
        : rule.type === "dead_stock"
          ? 90
          : 30;
    const cutoff = new Date(now.getTime() - days * DAY_MS);
    const items = await InventoryItem.find(
      itemFilter(rule),
    ).lean();
    const itemIds = items.map((item) => item._id);

    const recentOutbound = await InventoryMovement.distinct(
      "inventoryItemId",
      {
        inventoryItemId: { $in: itemIds },
        type: {
          $in: [
            "sale",
            "adjustment_out",
            "wastage",
            "return_out",
            "transfer_out",
          ],
        },
        createdAt: { $gte: cutoff },
      },
    );
    const moving = new Set(
      recentOutbound.map((id) => String(id)),
    );

    return items
      .filter(
        (item) =>
          item.currentStock > 0 &&
          !moving.has(String(item._id)),
      )
      .map((item) => ({
        inventoryItemId: item._id,
        severity:
          rule.type === "dead_stock"
            ? "warning"
            : "info",
        message: `${item.name} (${item.sku}) has stock but no outbound movement in the last ${days} days.`,
        observedValue: days,
        thresholdValue: days,
        metadata: {
          sku: item.sku,
          unit: item.unit,
          currentStock: item.currentStock,
        },
      }));
  }

  return [];
}

export async function evaluateInventoryAlerts(
  ruleIds?: string[],
) {
  const now = new Date();
  const rules = (await InventoryAlertRule.find({
    enabled: true,
    ...(ruleIds?.length
      ? { _id: { $in: ruleIds } }
      : {}),
  }).lean()) as Rule[];

  let detected = 0;
  let created = 0;
  let refreshed = 0;

  for (const rule of rules) {
    const candidates = await candidatesForRule(rule, now);
    detected += candidates.length;

    for (const candidate of candidates) {
      const subject =
        candidate.discriminator ??
        String(candidate.inventoryItemId ?? "global");
      const fingerprint = [
        String(rule._id),
        rule.type,
        subject,
      ].join(":");

      const result =
        await InventoryAlertEvent.updateOne(
          { fingerprint },
          {
            $set: {
              ruleId: rule._id,
              inventoryItemId:
                candidate.inventoryItemId ?? null,
              inventoryMovementId:
                candidate.inventoryMovementId ?? null,
              type: rule.type,
              severity: candidate.severity,
              message: candidate.message,
              observedValue:
                candidate.observedValue ?? null,
              thresholdValue:
                candidate.thresholdValue ?? null,
              metadata: candidate.metadata ?? {},
              lastDetectedAt: now,
            },
            $setOnInsert: {
              fingerprint,
              status: "open",
              firstDetectedAt: now,
              occurrenceCount: 0,
            },
            $inc: { occurrenceCount: 1 },
          },
          { upsert: true },
        );

      if (result.upsertedCount > 0) {
        created += 1;

        const event = await InventoryAlertEvent.findOne({
          fingerprint,
        })
          .select("_id type severity message inventoryItemId")
          .lean();

        if (event) {
          await createInventoryAdminNotifications({
            title: `Inventory ${candidate.severity} alert`,
            message: candidate.message,
            actionUrl: "/admin/inventory-analytics",
            metadata: {
              alertEventId: String(event._id),
              alertType: rule.type,
              severity: candidate.severity,
              inventoryItemId:
                candidate.inventoryItemId
                  ? String(candidate.inventoryItemId)
                  : null,
            },
          });

          await recordInventoryAudit({
            action: "inventory.alert_created",
            entityType: "InventoryAlertEvent",
            entityId: String(event._id),
            description: candidate.message,
            metadata: {
              ruleId: String(rule._id),
              type: rule.type,
              severity: candidate.severity,
              fingerprint,
            },
          });

          publishInventoryEnterpriseEvent({
            event: "inventory.alert_created",
            entityId: String(event._id),
            data: {
              alertEventId: String(event._id),
              type: rule.type,
              severity: candidate.severity,
              message: candidate.message,
              inventoryItemId:
                candidate.inventoryItemId
                  ? String(candidate.inventoryItemId)
                  : null,
            },
          });
        }
      } else {
        refreshed += 1;
      }
    }
  }

  return {
    scannedRules: rules.length,
    detected,
    created,
    refreshed,
    scannedAt: now,
  };
}
