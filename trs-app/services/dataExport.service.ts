import mongoose from "mongoose";
import type {
  Collection,
  Document,
} from "mongodb";

import {
  documentsToCsv,
} from "@/lib/data-transfer/csv";
import {
  assertSafeCollectionName,
} from "@/lib/data-transfer/sanitize";

function getNativeCollection(
  collectionName: string,
): Collection<Document> {
  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "Database connection is not ready.",
    );
  }

  return database.collection(
    assertSafeCollectionName(
      collectionName,
    ),
  );
}

export async function listExportableCollections() {
  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "Database connection is not ready.",
    );
  }

  const collections =
    await database
      .listCollections(
        {},
        {
          nameOnly: true,
        },
      )
      .toArray();

  return collections
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name !== "system.profile",
    )
    .sort((left, right) =>
      left.localeCompare(right),
    );
}

export async function exportCollection(
  collectionName: string,
  limit: number,
) {
  const collection =
    getNativeCollection(collectionName);

  const documents =
    await collection
      .find({})
      .limit(limit)
      .toArray();

  return documents.map(
    (document) =>
      document as Record<string, unknown>,
  );
}

export async function exportCollectionAsCsv(
  collectionName: string,
  limit: number,
) {
  const documents =
    await exportCollection(
      collectionName,
      limit,
    );

  return documentsToCsv(documents);
}
