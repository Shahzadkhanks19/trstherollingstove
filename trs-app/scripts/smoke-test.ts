async function main() {
 type SmokeResult = {
  name: string;
  url: string;
  passed: boolean;
  status?: number;
  message: string;
  durationMs: number;
};

const baseUrl =
  process.env.SMOKE_TEST_BASE_URL ??
  process.env.APP_URL;

if (!baseUrl) {
  console.error(
    "SMOKE_TEST_BASE_URL or APP_URL is required.",
  );
  process.exit(1);
}

const normalizedBaseUrl =
  baseUrl.replace(/\/+$/, "");

const endpoints = [
  {
    name: "liveness",
    path: "/api/v1/health/live",
    expectedStatuses: [200],
  },
  {
    name: "readiness",
    path: "/api/v1/health/ready",
    expectedStatuses: [200],
  },
  {
    name: "public-home",
    path: "/api/v1/public/home",
    expectedStatuses: [200],
  },
  {
    name: "public-menu",
    path: "/api/v1/public/menu?limit=1",
    expectedStatuses: [200],
  },
  {
    name: "public-settings",
    path: "/api/v1/public/settings",
    expectedStatuses: [200],
  },
];

async function checkEndpoint(
  endpoint:
    (typeof endpoints)[number],
): Promise<SmokeResult> {
  const url =
    `${normalizedBaseUrl}${endpoint.path}`;

  const startedAt =
    performance.now();

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent":
            "trs-production-smoke-test",
        },
        signal:
          AbortSignal.timeout(15_000),
      });

    const durationMs = Number(
      (
        performance.now() -
        startedAt
      ).toFixed(2),
    );

    const passed =
      endpoint.expectedStatuses.includes(
        response.status,
      );

    return {
      name: endpoint.name,
      url,
      passed,
      status: response.status,
      message: passed
        ? "Endpoint passed."
        : `Unexpected HTTP ${response.status}.`,
      durationMs,
    };
  } catch (error) {
    return {
      name: endpoint.name,
      url,
      passed: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown request failure.",
      durationMs: Number(
        (
          performance.now() -
          startedAt
        ).toFixed(2),
      ),
    };
  }
}

const results =
  await Promise.all(
    endpoints.map(checkEndpoint),
  );

for (const result of results) {
  console.log(
    `${result.passed ? "PASS" : "FAIL"} ${result.name} ${result.status ?? "-"} ${result.durationMs}ms ${result.url}`,
  );
}

const failed =
  results.filter(
    (result) => !result.passed,
  );

if (failed.length > 0) {
  console.error(
    `${failed.length} smoke test(s) failed.`,
  );
  process.exit(1);
}

console.log(
  "All production smoke tests passed.",
);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
