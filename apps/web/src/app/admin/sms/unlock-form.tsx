"use client";

import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { unlockSmsCountriesAction } from "./actions";

/** With no `organizationId`, the admin types one (an organization that hasn't sent yet). */
export function UnlockCountriesForm(props: { organizationId?: string; unlocked: string[] }) {
  const [state, formAction, pending] = useActionToast(unlockSmsCountriesAction, {
    success: "Countries unlocked",
  });
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {props.organizationId ? (
        <input name="organizationId" type="hidden" value={props.organizationId} />
      ) : (
        <Input className="h-8 w-72" name="organizationId" placeholder="org_…" required />
      )}
      <Input
        className="h-8 w-40"
        defaultValue={props.unlocked.join(", ")}
        name="countries"
        placeholder="NG, PK"
      />
      <Input className="h-8 w-56" name="reason" placeholder="Reason (required)" required />
      <Button loading={pending} size="xs" type="submit" variant="outline">
        Save
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}
