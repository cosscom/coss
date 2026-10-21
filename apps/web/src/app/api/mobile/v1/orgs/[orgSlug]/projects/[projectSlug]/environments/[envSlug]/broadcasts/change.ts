import type { BroadcastChangeResponse } from "@coss/companion";
import {
  BroadcastError,
  cancelBroadcast,
  EmailError,
  pauseBroadcast,
  resumeBroadcast,
} from "@coss/email";
import { recordAudit } from "@/lib/audit";
import { liveProviderName, usageGate } from "@/lib/broadcasts";
import { MobileApiError, requireMobileEnvironment, requireMobileWrite } from "@/lib/mobile-api";

export type BroadcastChange = "pause" | "resume" | "cancel";

const AUDIT_ACTIONS: Record<BroadcastChange, string> = {
  pause: "broadcast.paused",
  resume: "broadcast.resumed",
  cancel: "broadcast.canceled",
};

/**
 * The dashboard's changeBroadcastAction (broadcasts/actions.ts): `broadcast:send`, refused while
 * the organization is suspended, the same `@coss/email` call and the same audit event.
 */
export async function changeBroadcast(
  request: Request,
  params: { orgSlug: string; projectSlug: string; envSlug: string; broadcastId: string },
  change: BroadcastChange,
): Promise<BroadcastChangeResponse> {
  const { broadcastId, ...environmentParams } = params;
  const context = await requireMobileEnvironment(request, environmentParams, {
    broadcast: ["read"],
  });
  requireMobileWrite(context, { broadcast: ["send"] });
  const { scope, project, environment } = context;
  let broadcast: Awaited<ReturnType<typeof pauseBroadcast>>;
  try {
    broadcast =
      change === "pause"
        ? await pauseBroadcast(scope, broadcastId, { billing: await usageGate() })
        : change === "cancel"
          ? await cancelBroadcast(scope, broadcastId, { billing: await usageGate() })
          : await resumeBroadcast(
              { ...scope, projectId: project.id, mode: environment.mode },
              broadcastId,
              { liveProvider: liveProviderName() },
            );
  } catch (error) {
    if (error instanceof BroadcastError || error instanceof EmailError) {
      throw error.code === "not_found"
        ? new MobileApiError(404, "not_found", error.message)
        : new MobileApiError(400, "invalid_request", error.message);
    }
    throw error;
  }
  if (!broadcast) throw new MobileApiError(404, "not_found", "Broadcast not found.");
  await recordAudit(context.session, {
    action: AUDIT_ACTIONS[change],
    organizationId: scope.organizationId,
    projectId: project.id,
    environmentId: scope.environmentId,
    target: { type: "broadcast", id: broadcastId, label: broadcast.name },
  });
  return { status: broadcast.status };
}
