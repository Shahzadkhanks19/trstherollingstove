import mongoose from "mongoose";
import type { IndexDescriptionInfo } from "mongodb";

import type { IndexIssue } from "@/types/observability";

type RecommendedIndex = {
  collection: string;
  name: string;
  keys: Record<string, number>;
};

const RECOMMENDED_INDEXES: RecommendedIndex[] = [
  { collection: "orders", name: "customerId_1_createdAt_-1", keys: { customerId: 1, createdAt: -1 } },
  { collection: "orders", name: "status_1_createdAt_-1", keys: { status: 1, createdAt: -1 } },
  { collection: "reservations", name: "customerId_1_createdAt_-1", keys: { customerId: 1, createdAt: -1 } },
  { collection: "notifications", name: "userId_1_createdAt_-1", keys: { userId: 1, createdAt: -1 } },
  { collection: "menuitems", name: "isActive_1_isAvailable_1_sortOrder_1", keys: { isActive: 1, isAvailable: 1, sortOrder: 1 } },
];

function normalizeKeys(index: IndexDescriptionInfo) {
  const key = index.key;
  const normalized: Record<string, number> = {};

  for (const [field, direction] of Object.entries(key)) {
    if (typeof direction === "number") {
      normalized[field] = direction;
    }
  }

  return normalized;
}

function sameKeys(left: Record<string, number>, right: Record<string, number>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function auditDatabaseIndexes() {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("Database connection is not ready.");
  }

  const existingCollections = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(
      (entry) => entry.name,
    ),
  );

  const issues: IndexIssue[] = [];
  const inspected: Record<string, number> = {};

  for (const collectionName of existingCollections) {
    if (collectionName.startsWith("system.")) {
      continue;
    }

    const indexes = await database.collection(collectionName).indexes();
    inspected[collectionName] = indexes.length;

    for (let leftIndex = 0; leftIndex < indexes.length; leftIndex += 1) {
      const left = indexes[leftIndex];

      if (!left || left.name === "_id_") {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < indexes.length; rightIndex += 1) {
        const right = indexes[rightIndex];

        if (!right || right.name === "_id_") {
          continue;
        }

        if (sameKeys(normalizeKeys(left), normalizeKeys(right))) {
          issues.push({
            collection: collectionName,
            type: "duplicate",
            indexName: right.name ?? "unnamed",
            keys: normalizeKeys(right),
            recommendation: `Review and remove one duplicate index from ${collectionName}.`,
          });
        }
      }
    }
  }

  for (const recommended of RECOMMENDED_INDEXES) {
    if (!existingCollections.has(recommended.collection)) {
      continue;
    }

    const indexes = await database.collection(recommended.collection).indexes();
    const exists = indexes.some((index) =>
      sameKeys(normalizeKeys(index), recommended.keys),
    );

    if (!exists) {
      issues.push({
        collection: recommended.collection,
        type: "missing",
        indexName: recommended.name,
        keys: recommended.keys,
        recommendation: `Add the recommended ${recommended.name} index after validating production query patterns.`,
      });
    }
  }

  return {
    inspectedCollections: Object.keys(inspected).length,
    indexesPerCollection: inspected,
    issueCount: issues.length,
    issues,
  };
}
