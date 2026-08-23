import {
  inspectProductionEnvironment,
} from "../config/productionReadiness";

const result =
  inspectProductionEnvironment();

if (result.issues.length === 0) {
  console.log(
    "Production environment validation passed.",
  );
  process.exit(0);
}

for (const issue of result.issues) {
  const prefix =
    issue.severity === "error"
      ? "ERROR"
      : "WARNING";

  console.log(
    `[${prefix}] ${issue.field}: ${issue.message}`,
  );
}

if (!result.valid) {
  process.exit(1);
}

console.log(
  "Environment validation completed with warnings.",
);
