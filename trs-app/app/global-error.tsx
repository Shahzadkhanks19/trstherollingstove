"use client";

import { ErrorPageClient } from "@/components/site/ErrorPageClient";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorPageClient error={error} reset={reset} standalone />
      </body>
    </html>
  );
}
