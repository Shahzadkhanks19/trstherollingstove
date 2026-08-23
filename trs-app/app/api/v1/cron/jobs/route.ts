import { timingSafeEqual } from "crypto";

import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  runBackgroundWorker,
} from "@/services/jobRunner.service";
import {
  enqueueScheduledJobs,
} from "@/services/jobScheduler.service";

function safeTokenEqual(
  supplied: string,
  expected: string,
) {
  const suppliedBuffer =
    Buffer.from(supplied);
  const expectedBuffer =
    Buffer.from(expected);

  if (
    suppliedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    suppliedBuffer,
    expectedBuffer,
  );
}

function authorizeCron(
  request: Request,
) {
  const expected =
    process.env.CRON_SECRET;

  if (!expected) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  const supplied =
    authorization?.startsWith(
      "Bearer ",
    )
      ? authorization.slice(7)
      : request.headers.get(
          "x-cron-secret",
        ) ?? "";

  return safeTokenEqual(
    supplied,
    expected,
  );
}

export async function POST(
  request: Request,
) {
  try {
    if (!authorizeCron(request)) {
      return Response.json(
        {
          success: false,
          message: "Unauthorized cron request.",
        },
        {
          status: 401,
        },
      );
    }

    await connectToDatabase();

    const scheduled =
      await enqueueScheduledJobs();

    const worker =
      await runBackgroundWorker(20);

    return successResponse({
      scheduled,
      worker,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
