import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./load-env";

export default async function setup() {
  const frontendRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  execSync("pnpm exec prisma migrate deploy", {
    cwd: frontendRoot,
    stdio: "inherit",
    env: process.env,
  });
}
