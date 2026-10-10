import { auth } from "@coss/auth";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestUser, type TestUser } from "../src/testing.ts";

/** A fresh organization (no projects) owned by a fresh user. */
export async function createTestOrganization(): Promise<{
  owner: TestUser;
  organization: { id: string; slug: string };
}> {
  const owner = await createTestUser();
  const suffix = uniqueSuffix();
  const organization = await auth.api.createOrganization({
    body: { name: `Org ${suffix}`, slug: `org-${suffix}`, userId: owner.id },
  });
  if (!organization) throw new Error("organization was not created");
  return { owner, organization: { id: organization.id, slug: organization.slug } };
}
