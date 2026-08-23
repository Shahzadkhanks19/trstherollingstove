import {
  spawnSync,
} from "node:child_process";

const commands: Array<[string, string[]]> = [
  ["npm", ["run", "lint"]],
  ["npm", ["run", "type-check"]],
  ["npm", ["run", "build"]],
];

for (
  const [command, args] of commands
) {
  console.log(
    `\n> ${command} ${args.join(" ")}`,
  );

  const result =
    spawnSync(
      command,
      args,
      {
        stdio: "inherit",
        shell:
          process.platform === "win32",
      },
    );

  if (
    result.error ||
    result.status !== 0
  ) {
    console.error(
      `Pre-deployment command failed: ${command} ${args.join(" ")}`,
    );
    process.exit(
      result.status ?? 1,
    );
  }
}

console.log(
  "\nPre-deployment verification passed.",
);
