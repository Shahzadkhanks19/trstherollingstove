export const DATA_EXPORT_FORMATS = [
  "json",
  "csv",
] as const;

export type DataExportFormat =
  (typeof DATA_EXPORT_FORMATS)[number];

export const RESTORE_MODES = [
  "insert",
  "upsert",
] as const;

export type RestoreMode =
  (typeof RESTORE_MODES)[number];

export type BackupCollectionManifest = {
  name: string;
  documentCount: number;
};

export type BackupManifest = {
  version: 1;
  application: "trs-app";
  createdAt: string;
  databaseName: string;
  collections: BackupCollectionManifest[];
};

export type LogicalBackupFile = {
  manifest: BackupManifest;
  data: Record<string, unknown[]>;
};
