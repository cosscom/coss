/**
 * Grants the platform admin role to an existing user:
 *   bun run admin:create --email someone@example.com
 */
import { closeDb } from "@coss/db";
import { promoteToAdmin, TenancyError } from "../src/index.ts";

function parseEmail(argv: readonly string[]): string | undefined {
  for (const [index, arg] of argv.entries()) {
    if (arg === "--email") return argv[index + 1];
    if (arg.startsWith("--email=")) return arg.slice("--email=".length);
  }
  return undefined;
}

const email = parseEmail(process.argv.slice(2))?.trim();

// Intentionally allowed in production: this is how the first platform admin is bootstrapped.
if (!email || email.startsWith("--")) {
  console.error("Usage: bun run admin:create --email <email>");
  process.exitCode = 1;
} else {
  try {
    const user = await promoteToAdmin(email);
    console.info(`${user.email} (${user.id}) is now a platform admin.`);
  } catch (error) {
    if (error instanceof TenancyError && error.code === "not_found") {
      console.error(`${error.message} Sign up first, then rerun this command.`);
    } else {
      console.error("Failed to promote user:", error);
    }
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
