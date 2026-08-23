import { setAuthCookies } from "@/lib/auth/cookies";
import { getRequestMetadata } from "@/lib/auth/requestMeta";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  authenticate,
  createSession,
} from "@/services/auth.service";
import { loginSchema } from "@/validators/auth";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

type LoginErrorResponse = {
  success: false;
  message: string;
  errors?: Array<{
    path: Array<string | number | symbol>;
    message: string;
  }>;
};

export async function POST(request: Request) {
  try {
    await requirePublicOrderingEnabled();
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      const responseBody: LoginErrorResponse = {
        success: false,
        message: "The login request body is invalid.",
        errors: [
          {
            path: [],
            message: "A valid JSON request body is required.",
          },
        ],
      };

      return Response.json(responseBody, {
        status: 400,
      });
    }

    const validationResult =
      loginSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const responseBody: LoginErrorResponse = {
        success: false,
        message: "Validation failed.",
        errors: validationResult.error.issues.map(
          (issue) => ({
            path: issue.path,
            message: issue.message,
          }),
        ),
      };

      return Response.json(responseBody, {
        status: 400,
      });
    }

    const input = validationResult.data;

    const normalizedIdentifier =
      input.identifier.trim().toLowerCase();

    const metadata = await getRequestMetadata();

    const user = await authenticate(
      normalizedIdentifier,
      input.password,
    );

    const session = await createSession(
      user,
      metadata,
    );

    await setAuthCookies(
      session.accessToken,
      session.refreshToken,
      input.rememberMe,
    );

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      "Login successful.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
