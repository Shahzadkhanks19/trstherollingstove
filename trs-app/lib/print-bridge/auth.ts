import { hashOpaqueToken } from "@/lib/auth/randomToken";
import { AppError } from "@/lib/errors/AppError";
import { PrintBridgeDevice } from "@/models/PrintBridgeDevice";

function readBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new AppError("Print bridge authentication is required.", 401, { code: "PRINT_BRIDGE_AUTH_REQUIRED" });
  }

  const token = authorization.slice(7).trim();
  if (token.length < 32 || token.length > 256) {
    throw new AppError("Print bridge token is invalid.", 401, { code: "PRINT_BRIDGE_TOKEN_INVALID" });
  }
  return token;
}

export async function requirePrintBridgeDevice(request: Request) {
  const tokenHash = hashOpaqueToken(readBearerToken(request));
  const device = await PrintBridgeDevice.findOne({ tokenHash, isActive: true, revokedAt: null }).select("+tokenHash");
  if (!device) {
    throw new AppError("Print bridge token is invalid or revoked.", 401, { code: "PRINT_BRIDGE_TOKEN_INVALID" });
  }
  return device;
}
