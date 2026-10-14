/**
 * Prints the deployment spec as JSON for whoever provisions AWS:
 *   bun run --cwd infra aws:spec
 * or rewrites the copy Terraform reads (a test fails when it is stale):
 *   bun run --cwd infra aws:spec:write
 */
import { writeFileSync } from "node:fs";
import { awsSpecJson } from "./spec.ts";

const out = process.argv.indexOf("--out");
if (out === -1) {
  process.stdout.write(awsSpecJson());
} else {
  const file = process.argv[out + 1];
  if (!file) throw new Error("--out needs a file");
  writeFileSync(file, awsSpecJson());
}
