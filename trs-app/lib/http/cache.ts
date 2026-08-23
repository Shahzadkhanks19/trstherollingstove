import { createHash } from "node:crypto";

export function createEtag(value: string | Buffer) {
  const digest = createHash("sha256")
    .update(value)
    .digest("base64url");

  return `\"${digest}\"`;
}

export function cacheControl(options: {
  public?: boolean;
  maxAge?: number;
  staleWhileRevalidate?: number;
  noStore?: boolean;
}) {
  if (options.noStore) {
    return "no-store";
  }

  const directives = [options.public ? "public" : "private"];

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(
      `stale-while-revalidate=${Math.max(
        0,
        Math.floor(options.staleWhileRevalidate),
      )}`,
    );
  }

  return directives.join(", ");
}

export function conditionalJsonResponse(
  request: Request,
  data: unknown,
  options: {
    status?: number;
    cacheControl?: string;
  } = {},
) {
  const body = JSON.stringify(data);
  const etag = createEtag(body);

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        etag,
        ...(options.cacheControl
          ? { "cache-control": options.cacheControl }
          : {}),
      },
    });
  }

  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      etag,
      ...(options.cacheControl
        ? { "cache-control": options.cacheControl }
        : {}),
    },
  });
}
