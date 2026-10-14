/**
 * Where each of the customer's users logged in from: their countries and networks (ASNs), by
 * user hash, for `login.new_country` / `login.new_network`. A user without history has nothing to
 * compare with, so their first logins never fire either reason.
 */
import { type Executor, schema } from "@coss/db";
import { and, eq, sql } from "drizzle-orm";

const { riskUserNetwork } = schema;

type Scope = { organizationId: string; environmentId: string };

export type UserNetworks = { countries: Set<string>; asns: Set<string> };

export async function userNetworks(
  executor: Executor,
  scope: Scope,
  userHash: string,
): Promise<UserNetworks> {
  const rows = await executor
    .select({ kind: riskUserNetwork.kind, value: riskUserNetwork.value })
    .from(riskUserNetwork)
    .where(
      and(
        eq(riskUserNetwork.organizationId, scope.organizationId),
        eq(riskUserNetwork.environmentId, scope.environmentId),
        eq(riskUserNetwork.userHash, userHash),
      ),
    );
  const networks: UserNetworks = { countries: new Set(), asns: new Set() };
  for (const row of rows)
    (row.kind === "country" ? networks.countries : networks.asns).add(row.value);
  return networks;
}

/** Records (or refreshes) a user's country and network. */
export async function rememberUserNetwork(
  executor: Executor,
  scope: Scope,
  userHash: string,
  network: { country: string | null; asn: number | null },
  now: Date,
): Promise<void> {
  const values = [
    ...(network.country ? [{ kind: "country" as const, value: network.country }] : []),
    ...(network.asn ? [{ kind: "asn" as const, value: String(network.asn) }] : []),
  ];
  if (values.length === 0) return;
  await executor
    .insert(riskUserNetwork)
    .values(
      values.map((item) => ({ ...scope, userHash, ...item, firstSeenAt: now, lastSeenAt: now })),
    )
    .onConflictDoUpdate({
      target: [
        riskUserNetwork.environmentId,
        riskUserNetwork.userHash,
        riskUserNetwork.kind,
        riskUserNetwork.value,
      ],
      set: { lastSeenAt: sql`excluded.last_seen_at` },
    });
}
