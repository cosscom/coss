"use server";

import { db } from "@coss/db";
import { FormError, setFormDisabledByAdmin } from "@coss/forms";
import { recordAdminAction } from "@coss/tenancy/admin";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { requirePlatformAdminAction } from "@/lib/session";

/** Disables a form for abuse (phishing, spam) or turns it back on, audited in the same transaction. */
export async function setFormDisabledAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const formId = formString(formData, "formId");
    const disabled = formString(formData, "disabled") === "true";
    const reason = formString(formData, "reason");
    await db
      .transaction(async (tx) => {
        const form = await setFormDisabledByAdmin(formId, disabled, tx);
        await recordAdminAction(
          {
            actor,
            action: disabled ? "form.disable" : "form.enable",
            target: { type: "form", id: formId },
            organizationId: form.organizationId,
            reason,
            metadata: { name: form.name },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        if (error instanceof FormError) throw new ActionError(error.message);
        throw error;
      });
    refresh();
    return null;
  });
}
