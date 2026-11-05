import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const alias = { "@": path.join(root, "src") };

export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: path.join(root, "coverage"),
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/lib/auth-client.ts",
        "src/lib/interview/api-service.ts",
        "src/lib/interview/mock-service.ts",
        "src/lib/interview/session-storage.ts",
        "src/lib/interview/use-interview-conversation.ts",
        "src/lib/interview/index.ts",
        "src/lib/realtime/use-event-stream.ts",
        "**/*.tsx",
      ],
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          root,
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/setup/unit.setup.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          root,
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/setup/integration.setup.ts"],
          globalSetup: ["tests/setup/global-integration.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
          sequence: { concurrent: false },
          pool: "forks",
        },
      },
    ],
  },
});
