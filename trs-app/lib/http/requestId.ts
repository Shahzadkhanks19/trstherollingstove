import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export function resolveRequestId(request: Request) {
  const supplied = request.headers.get(REQUEST_ID_HEADER)?.trim();

  if (supplied && supplied.length <= 128) {
    return supplied;
  }

  return randomUUID();
}
