export function getRequestIp(
  request: Request,
) {
  const forwardedFor = request.headers.get(
    "x-forwarded-for",
  );

  if (forwardedFor) {
    return forwardedFor
      .split(",")[0]
      ?.trim()
      .slice(0, 100) ?? "";
  }

  return (
    request.headers
      .get("x-real-ip")
      ?.trim()
      .slice(0, 100) ?? ""
  );
}

export function getRequestUserAgent(
  request: Request,
) {
  return (
    request.headers
      .get("user-agent")
      ?.trim()
      .slice(0, 1000) ?? ""
  );
}

export function getRequestId(
  request: Request,
) {
  return (
    request.headers
      .get("x-request-id")
      ?.trim()
      .slice(0, 200) ?? ""
  );
}
