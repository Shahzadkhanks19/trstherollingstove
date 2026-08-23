const BLOCKED_COLLECTIONS = new Set([
  "system.profile",
]);

const COLLECTION_NAME_PATTERN =
  /^[a-zA-Z0-9_.-]+$/;

export function assertSafeCollectionName(
  collectionName: string,
) {
  const normalized =
    collectionName.trim();

  if (
    !normalized ||
    normalized.length > 120 ||
    !COLLECTION_NAME_PATTERN.test(normalized) ||
    BLOCKED_COLLECTIONS.has(normalized)
  ) {
    throw new Error(
      "Invalid or restricted collection name.",
    );
  }

  return normalized;
}

export function parseCollectionList(
  value?: string,
) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) =>
          assertSafeCollectionName(entry),
        )
        .filter(Boolean),
    ),
  );
}
