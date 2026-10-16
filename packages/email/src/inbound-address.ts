/**
 * Each environment's address space under coss.com's managed inbound domain:
 * `<anything>@<label>.<INBOUND_MANAGED_DOMAIN>` reaches the environment with no DNS setup.
 */
import { randomInt } from "node:crypto";
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import type { InboundAddressObjectOutput } from "./schemas.ts";

const { environmentInboundAddress } = schema;

const LABEL_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const LABEL_LENGTH = 12;

function newLabel(): string {
  let label = "";
  for (let i = 0; i < LABEL_LENGTH; i++) label += LABEL_ALPHABET[randomInt(LABEL_ALPHABET.length)];
  return label;
}

/** The label of `<label>.<managedDomain>` when `domain` is one, else `null`. */
export function managedLabelOf(domain: string, managedDomain: string): string | null {
  const suffix = `.${managedDomain.toLowerCase()}`;
  if (!domain.endsWith(suffix)) return null;
  const label = domain.slice(0, -suffix.length);
  return label && !label.includes(".") ? label : null;
}

/**
 * The environment's managed inbound domain, created on first use (concurrent first uses agree
 * on one label).
 */
export async function inboundAddressFor(
  input: { organizationId: string; environmentId: string },
  managedDomain: string,
): Promise<InboundAddressObjectOutput> {
  const toObject = (label: string): InboundAddressObjectOutput => ({
    object: "inbound_address",
    environment_id: input.environmentId,
    domain: `${label}.${managedDomain}`,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const [existing] = await db
      .select({ label: environmentInboundAddress.label })
      .from(environmentInboundAddress)
      .where(
        and(
          eq(environmentInboundAddress.environmentId, input.environmentId),
          eq(environmentInboundAddress.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (existing) return toObject(existing.label);
    // A clash with another environment's label (or a concurrent insert) leaves nothing inserted;
    // the next round reads the winner or tries a new label.
    const [inserted] = await db
      .insert(environmentInboundAddress)
      .values({
        environmentId: input.environmentId,
        organizationId: input.organizationId,
        label: newLabel(),
      })
      .onConflictDoNothing()
      .returning({ label: environmentInboundAddress.label });
    if (inserted) return toObject(inserted.label);
  }
  throw new Error(`Could not create an inbound address for ${input.environmentId}.`);
}
