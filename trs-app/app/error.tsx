"use client";

import { ErrorPageClient } from "@/components/site/ErrorPageClient";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPageClient error={error} reset={reset} />;
}
