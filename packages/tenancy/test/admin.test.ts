import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import { promoteToAdmin, TenancyError } from "../src/index.ts";
import { createTestUser } from "../src/testing.ts";

describe("promoteToAdmin", () => {
  test("sets the platform admin role, matching email case-insensitively", async () => {
    const user = await createTestUser();
    expect(await promoteToAdmin(`  ${user.email.toUpperCase()} `)).toEqual({
      id: user.id,
      email: user.email,
    });
    const [row] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, user.id));
    expect(row?.role).toBe("admin");
  });

  test("unknown email is not_found", async () => {
    const error = await promoteToAdmin(`nobody-${uniqueSuffix()}@coss.test`).catch((e) => e);
    expect(error).toBeInstanceOf(TenancyError);
    expect(error.code).toBe("not_found");
  });
});
