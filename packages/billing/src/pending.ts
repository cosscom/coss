/**
 * An upgrade's credit grants wait in its invoice's `terms_snapshot` until the invoice is paid
 * (`afterSettled` inserts them): unpaid upgrades must not hand out credit.
 */
import { isMeterKey, type MeterKey } from "./catalog/meters.ts";
import type { DraftGrant } from "./engine/types.ts";
import { stringifyWithBigInt } from "./money.ts";

export function pendingGrantsSnapshot(grants: readonly DraftGrant[]): unknown[] {
  return JSON.parse(stringifyWithBigInt(grants));
}

export function parsePendingGrants(snapshot: Record<string, unknown> | null): DraftGrant[] {
  const raw = snapshot?.pendingGrants;
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => {
    const grant = value as Record<string, unknown>;
    const meter = typeof grant.meter === "string" && isMeterKey(grant.meter) ? grant.meter : null;
    return {
      key: String(grant.key),
      kind: grant.kind === "units" ? "units" : "amount",
      amount: BigInt(String(grant.amount)),
      meter,
      dimension: typeof grant.dimension === "string" ? grant.dimension : null,
      scope: Array.isArray(grant.scope)
        ? (grant.scope.filter(
            (m): m is string => typeof m === "string" && isMeterKey(m),
          ) as MeterKey[])
        : null,
      appliesTo: grant.appliesTo === "any" ? "any" : "usage",
      source: (grant.source as DraftGrant["source"]) ?? "fee",
      effectiveAt: new Date(String(grant.effectiveAt)),
      expiresAt: grant.expiresAt ? new Date(String(grant.expiresAt)) : null,
      contractId: typeof grant.contractId === "string" ? grant.contractId : null,
      description: String(grant.description ?? "Usage credit"),
      rolloverOf: typeof grant.rolloverOf === "string" ? grant.rolloverOf : undefined,
    };
  });
}
