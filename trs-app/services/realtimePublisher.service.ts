import type {
  RealtimePublishInput,
  RealtimePublishResult,
} from "@/types/realtime";

const DEFAULT_TIMEOUT_MS = 4_000;

function getRealtimeConfiguration() {
  const serverUrl =
    process.env.REALTIME_SERVER_URL?.trim() ??
    process.env.NEXT_PUBLIC_REALTIME_SERVER_URL?.trim() ??
    "";

  const internalSecret =
    process.env.REALTIME_INTERNAL_SECRET?.trim() ?? "";

  return {
    serverUrl: serverUrl.replace(/\/+$/, ""),
    internalSecret,
  };
}

function isDisabled() {
  return (
    process.env.REALTIME_PUBLISHING_DISABLED === "true"
  );
}

export async function publishRealtimeEvent(
  input: RealtimePublishInput,
): Promise<RealtimePublishResult> {
  if (isDisabled()) {
    return {
      delivered: false,
      skipped: true,
      reason: "Realtime publishing is disabled.",
    };
  }

  const { serverUrl, internalSecret } =
    getRealtimeConfiguration();

  if (!serverUrl || !internalSecret) {
    return {
      delivered: false,
      skipped: true,
      reason:
        "REALTIME_SERVER_URL or REALTIME_INTERNAL_SECRET is not configured.",
    };
  }

  try {
    const response = await fetch(
      `${serverUrl}/internal/events`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-realtime-secret": internalSecret,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(
          Number(
            process.env.REALTIME_PUBLISH_TIMEOUT_MS ??
              DEFAULT_TIMEOUT_MS,
          ),
        ),
        cache: "no-store",
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as
      | {
          event?: {
            id?: string;
          };
          error?: string;
        }
      | null;

    if (!response.ok) {
      console.error(
        "[realtime] Event publication failed.",
        {
          event: input.event,
          status: response.status,
          error:
            payload?.error ??
            response.statusText,
        },
      );

      return {
        delivered: false,
        skipped: false,
        status: response.status,
        reason:
          payload?.error ??
          response.statusText,
      };
    }

    return {
      delivered: true,
      skipped: false,
      status: response.status,
      eventId: payload?.event?.id,
    };
  } catch (error) {
    console.error(
      "[realtime] Event publication failed.",
      {
        event: input.event,
        error:
          error instanceof Error
            ? error.message
            : "Unknown realtime publication error.",
      },
    );

    return {
      delivered: false,
      skipped: false,
      reason:
        error instanceof Error
          ? error.message
          : "Unknown realtime publication error.",
    };
  }
}

export function publishRealtimeEventSafely(
  input: RealtimePublishInput,
): void {
  void publishRealtimeEvent(input);
}
