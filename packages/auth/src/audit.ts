/**
 * Organization changes Better Auth makes on its own HTTP routes (accepting or rejecting an
 * invitation), reported to the organization's audit log. `@coss/auth` can't depend on the log
 * (`@coss/logs` tests use tenancy, which depends on auth), so the app registers a recorder.
 */
export type OrgAuditRecord = {
  organizationId: string;
  actor: { type: "user"; id: string; label: string };
  action: string;
  target?: { type: string; id: string | null; label?: string | null };
  metadata?: Record<string, unknown>;
};

export type OrgAuditRecorder = (record: OrgAuditRecord) => Promise<void>;

let recorder: OrgAuditRecorder | null = null;

/** Called once by the app that serves `/api/auth` (the dashboard). */
export function setOrgAuditRecorder(next: OrgAuditRecorder | null): void {
  recorder = next;
}

/** Best effort: the change already happened, so a failure to record is only logged. */
export async function recordOrgAudit(record: OrgAuditRecord): Promise<void> {
  if (!recorder) return;
  try {
    await recorder(record);
  } catch (error) {
    console.error(`[auth] audit event ${record.action} not recorded:`, error);
  }
}
