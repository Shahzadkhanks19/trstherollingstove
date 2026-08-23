import mongoose from "mongoose";

import {
  listExportableCollections,
  exportCollection,
} from "@/services/dataExport.service";
import {
  assertSafeCollectionName,
} from "@/lib/data-transfer/sanitize";
import type {
  LogicalBackupFile,
} from "@/types/dataTransfer";

type CreateBackupInput = {
  collections?: string[];
  limitPerCollection: number;
};

export async function createLogicalBackup(
  input: CreateBackupInput,
): Promise<LogicalBackupFile> {
  const availableCollections =
    await listExportableCollections();

  const requestedCollections =
    input.collections?.length
      ? input.collections.map(
          assertSafeCollectionName,
        )
      : availableCollections;

  const selectedCollections =
    requestedCollections.filter(
      (name) =>
        availableCollections.includes(name),
    );

  const data: Record<
    string,
    unknown[]
  > = {};

  const manifestCollections = [];

  for (const collectionName of selectedCollections) {
    const documents =
      await exportCollection(
        collectionName,
        input.limitPerCollection,
      );

    data[collectionName] = documents;

    manifestCollections.push({
      name: collectionName,
      documentCount:
        documents.length,
    });
  }

  return {
    manifest: {
      version: 1,
      application: "trs-app",
      createdAt:
        new Date().toISOString(),
      databaseName:
        mongoose.connection.db
          ?.databaseName ?? "unknown",
      collections:
        manifestCollections,
    },
    data,
  };
}
