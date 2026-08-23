import mongoose from "mongoose";
import type {
  Collection,
  Document,
  Filter,
} from "mongodb";

import {
  assertSafeCollectionName,
} from "@/lib/data-transfer/sanitize";
import type {
  LogicalBackupFile,
  RestoreMode,
} from "@/types/dataTransfer";

type RestoreInput = {
  backup: LogicalBackupFile;
  mode: RestoreMode;
  dryRun: boolean;
};

type RestoreCollectionResult = {
  collection: string;
  received: number;
  inserted: number;
  upserted: number;
  skipped: number;
};

function getCollection(
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

function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function restoreLogicalBackup(
  input: RestoreInput,
) {
  const results:
    RestoreCollectionResult[] = [];

  for (
    const manifestEntry of
    input.backup.manifest.collections
  ) {
    const collectionName =
      assertSafeCollectionName(
        manifestEntry.name,
      );

    const rawDocuments =
      input.backup.data[
        collectionName
      ] ?? [];

    const documents =
      rawDocuments.filter(
        isPlainRecord,
      );

    const result:
      RestoreCollectionResult = {
        collection: collectionName,
        received: documents.length,
        inserted: 0,
        upserted: 0,
        skipped:
          rawDocuments.length -
          documents.length,
      };

    if (
      input.dryRun ||
      documents.length === 0
    ) {
      results.push(result);
      continue;
    }

    const collection =
      getCollection(collectionName);

    if (input.mode === "insert") {
      const insertResult =
        await collection.insertMany(
          documents,
          {
            ordered: false,
          },
        );

      result.inserted =
        insertResult.insertedCount;

      results.push(result);
      continue;
    }

    for (const document of documents) {
      const id = document._id;

      if (
        id === undefined ||
        id === null
      ) {
        await collection.insertOne(
          document,
        );

        result.inserted += 1;
        continue;
      }

      /*
       * Native backup documents can contain ObjectId, string,
       * number or other valid MongoDB _id values. Document's
       * default generic assumes ObjectId, so the filter must be
       * explicitly represented as a native MongoDB Filter.
       */
      const idFilter = {
        _id: id,
      } as Filter<Document>;

      await collection.updateOne(
        idFilter,
        {
          $set: document,
        },
        {
          upsert: true,
        },
      );

      result.upserted += 1;
    }

    results.push(result);
  }

  return {
    dryRun: input.dryRun,
    mode: input.mode,
    collections: results,
    summary: {
      received: results.reduce(
        (sum, entry) =>
          sum + entry.received,
        0,
      ),
      inserted: results.reduce(
        (sum, entry) =>
          sum + entry.inserted,
        0,
      ),
      upserted: results.reduce(
        (sum, entry) =>
          sum + entry.upserted,
        0,
      ),
      skipped: results.reduce(
        (sum, entry) =>
          sum + entry.skipped,
        0,
      ),
    },
  };
}