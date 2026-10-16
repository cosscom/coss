import type { DomainDmarcOutput } from "@coss/email/schemas";

/** Whether receivers fully reject the domain's failing mail: the end of the path. */
export function dmarcComplete(dmarc: Pick<DomainDmarcOutput, "policy" | "partial">): boolean {
  return dmarc.policy === "reject" && !dmarc.partial;
}

/**
 * What the DMARC page says when guidance offers no next step: either the domain is done, or
 * coss.com can't suggest one (no report address: this deployment doesn't receive email).
 */
export function dmarcNoNextStep(
  dmarc: Pick<
    DomainDmarcOutput,
    "policy" | "partial" | "reporting" | "report_address" | "inherited_from"
  >,
  domainName: string,
): string {
  if (dmarcComplete(dmarc)) {
    const whose = dmarc.inherited_from ? ` (through ${dmarc.inherited_from}'s record)` : "";
    return dmarc.reporting
      ? `${domainName} rejects mail that fails DMARC${whose}, the strongest protection against spoofing. coss.com keeps reading the reports and tells owners and admins if its own mail starts failing.`
      : `${domainName} rejects mail that fails DMARC${whose}, the strongest protection against spoofing.`;
  }
  if (dmarc.report_address === null) {
    return "This coss.com deployment doesn't receive email, so it can't read DMARC reports or tell when a stricter policy is safe for this domain.";
  }
  return "There is nothing to change in this domain's DMARC record right now.";
}
