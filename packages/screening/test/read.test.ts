import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { countScreeningsForAdmin, listScreeningsForAdmin } from "../src/read.ts";
import type { ScreeningVerdict } from "../src/screen.ts";

async function screening(tenant: TestTenant, verdict: ScreeningVerdict, subjectId: string) {
  const [row] = await db
    .insert(schema.contentScreening)
    .values({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      product: "email",
      subjectId,
      sequence: 1,
      classifier: "fake",
      verdict,
      latencyMs: 1,
    })
    .returning({ id: schema.contentScreening.id });
  return row?.id ?? "";
}

describe("listScreeningsForAdmin", () => {
  test("lists every organization's screenings newest first, filtered and paged", async () => {
    const one = await createTestTenant();
    const two = await createTestTenant();
    const subject = newId("email");
    const clean = await screening(one, "clean", newId("email"));
    const flagged = await screening(one, "flagged", subject);
    const blocked = await screening(two, "blocked", newId("email"));
    const scope = { organizationIds: [one.organization.id, two.organization.id] };

    const all = await listScreeningsForAdmin({ scope });
    expect(all.items.map((row) => row.id)).toEqual([blocked, flagged, clean]);
    expect(all.items[0]).toMatchObject({
      organizationId: two.organization.id,
      organizationName: two.organization.name,
      organizationSlug: two.organization.slug,
      verdict: "blocked",
    });

    const unclean = await listScreeningsForAdmin({ scope, verdicts: ["flagged", "blocked"] });
    expect(unclean.items.map((row) => row.id)).toEqual([blocked, flagged]);

    const first = await listScreeningsForAdmin({ scope, limit: 2 });
    expect(first.nextCursor).toBe(flagged);
    const second = await listScreeningsForAdmin({ scope, limit: 2, before: flagged });
    expect(second.items.map((row) => row.id)).toEqual([clean]);
    expect(second.nextCursor).toBeNull();

    const since = new Date(Date.now() - 60_000);
    expect(await countScreeningsForAdmin({ since, scope })).toEqual({
      clean: 1,
      flagged: 1,
      blocked: 1,
      error: 0,
    });
    expect(await countScreeningsForAdmin({ since, now: since, scope })).toMatchObject({
      flagged: 0,
    });

    const bySubject = await listScreeningsForAdmin({ subject: { product: "email", id: subject } });
    expect(bySubject.items.map((row) => row.id)).toEqual([flagged]);
  });
});
