import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const examplePath = path.join(frontendRoot, ".env.test.example");
const localPath = path.join(frontendRoot, ".env.test");

config({ path: examplePath, quiet: true });
if (existsSync(localPath)) {
  config({ path: localPath, override: true, quiet: true });
}

const defaults: Record<string, string> = {
  NODE_ENV: "test",
  POSTGRES_URL: "postgresql://nervio:nervio@127.0.0.1:5432/nervio_test",
  DATABASE_URL: "postgresql://nervio:nervio@127.0.0.1:5432/nervio_test",
  DIRECT_URL: "postgresql://nervio:nervio@127.0.0.1:5432/nervio_test",
  BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  CRON_SECRET: "test-cron-secret",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value;
}

// Nunca llamar servicios externos de verdad en el suite.
for (const key of [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_AGENT_ID",
  "ELEVENLABS_VOICE_ID",
  "N8N_WEBHOOK_GENERATE_INTERVIEW_URL",
  "N8N_WEBHOOK_SCHEDULE_NOTIFICATION_URL",
  "RESEND_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (!process.env[key]) process.env[key] = "";
}
