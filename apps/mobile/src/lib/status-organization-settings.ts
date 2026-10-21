import type { DmarcNextStepKind, DmarcStage, ScimSettingsResponse } from "@coss/companion";
import type { Tone } from "./theme";

// Labels and tones of the organization settings and DMARC pages, as the dashboard shows them.

/** `[tone, label]` of an SSO provider (apps/web/src/app/[orgSlug]/settings/sso/page.tsx). */
export function ssoProviderStatus(active: boolean): [Tone, string] {
  return active ? ["success", "Active"] : ["warning", "Inactive"];
}

/** `[tone, label]` of a directory (apps/web/src/app/[orgSlug]/settings/scim/page.tsx). */
export function scimDirectoryStatus(
  status: NonNullable<ScimSettingsResponse["directory"]>["status"],
): [Tone, string] {
  return status === "active" ? ["success", "Connected"] : ["warning", "Disconnecting"];
}

// apps/web/src/app/[orgSlug]/domains/[domainId]/dmarc/page.tsx
export const DMARC_STEPS = [
  { label: "Publish a record", detail: "Any v=DMARC1 record at _dmarc" },
  { label: "Monitor", detail: "p=none: reports, no effect on delivery" },
  { label: "Quarantine", detail: "p=quarantine: failing mail goes to spam" },
  { label: "Reject", detail: "p=reject: failing mail is refused" },
] as const;

export const DMARC_STAGE_INDEX: Record<DmarcStage, number> = {
  not_checked: 0,
  no_record: 0,
  monitoring: 1,
  quarantine: 2,
  reject: 3,
};

export const DMARC_NEXT_TITLE: Record<DmarcNextStepKind, string> = {
  publish: "Publish a DMARC record",
  add_reporting: "Send DMARC reports to coss.com",
  complete_rollout: "Apply the policy to all mail",
  tighten: "Move to a stricter policy",
};

/** A pass rate with one decimal: 99.4% and 100% read differently here. */
export function dmarcRate(passing: number, total: number): string {
  if (total === 0) return "—";
  const value = (passing / total) * 100;
  return `${value === 100 || value === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

/** A source's pass rate: all passed, none passed, or some. */
export function dmarcRateTone(passing: number, total: number): Tone {
  return passing === total ? "success" : passing === 0 ? "error" : "warning";
}

/** An aligned DKIM or SPF result of a report row. */
export function dmarcResultTone(value: "pass" | "fail"): Tone {
  return value === "pass" ? "success" : "error";
}
