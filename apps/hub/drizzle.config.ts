import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Scripts run from apps/hub; load the single root .env (never overrides already-set vars).
const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url: process.env.HUB_DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
