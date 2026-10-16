"use server";

import { ADMIN_REASON_MAX_LENGTH, recordAdminAction } from "@coss/tenancy/admin";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import {
  deployMainNow,
  deploysConfigured,
  GitHubError,
  getDeployOverview,
  redeployableCommits,
  redeployCommit,
} from "@/lib/deploys";
import { requirePlatformAdminAction } from "@/lib/session";

/**
 * Deploys from the admin console: each dispatches the Deploy workflow through the coss.com Deploy
 * GitHub App and records an `admin_audit_event` (GitHub shows the app as the actor).
 */

function reason(formData: FormData, required: boolean): string | null {
  const value = formString(formData, "reason");
  if (value.length > ADMIN_REASON_MAX_LENGTH) {
    throw new ActionError(`The reason must be at most ${ADMIN_REASON_MAX_LENGTH} characters.`);
  }
  if (required && !value) throw new ActionError("Enter a reason. It is kept in the audit log.");
  return value || null;
}

/** GitHub's own failures are worth showing as they are (a missing permission, a rate limit). */
async function withGitHub<T>(run: () => Promise<T>): Promise<T> {
  if (!deploysConfigured()) throw new ActionError("Deploys aren't set up on this dashboard.");
  try {
    return await run();
  } catch (error) {
    if (error instanceof GitHubError) throw new ActionError(error.message);
    throw error;
  }
}

/** Ships main's tip now, skipping the batch wait (and canceling the push runs waiting in it). */
export async function deployNowAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const note = reason(formData, false);
    const { commit, runId, canceledRunIds } = await withGitHub(deployMainNow);
    await recordAdminAction({
      actor,
      action: "deploy.started",
      target: { type: "commit", id: commit },
      reason: note,
      metadata: { runId, canceledRunIds },
    });
    refresh();
    return null;
  });
}

/**
 * Puts production back on a commit an earlier run deployed (its images are already built), until
 * main is deployed again.
 */
export async function redeployAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const commit = formString(formData, "commit");
    const note = reason(formData, true);
    const { runId, canceledRunIds } = await withGitHub(async () => {
      // Only a commit a recent run deployed: its images exist and it ran in production before.
      if (!redeployableCommits(await getDeployOverview()).has(commit)) {
        throw new ActionError("That commit can't be redeployed from here.");
      }
      return redeployCommit(commit);
    });
    await recordAdminAction({
      actor,
      action: "deploy.redeployed",
      target: { type: "commit", id: commit },
      reason: note,
      metadata: { runId, canceledRunIds },
    });
    refresh();
    return null;
  });
}
