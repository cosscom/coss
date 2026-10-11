"use client";

import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { rescheduleEmailAction } from "./actions";

type Target = {
  orgSlug: string;
  projectSlug: string;
  envSlug: string;
  emailId: string;
  /** The current `scheduled_at` (ISO 8601, UTC). */
  scheduledAt: string;
};

/** `2026-10-12T09:00:00.000Z` → `2026-10-12T09:00`, the `datetime-local` format (in UTC). */
function utcMinute(iso: string): string {
  return iso.slice(0, 16);
}

const MAX_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;

export function RescheduleEmailDialog(props: Target) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Reschedule</DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also resets the form. */}
        <RescheduleEmailForm {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function RescheduleEmailForm(props: Target) {
  const [state, formAction, pending] = useActionState(rescheduleEmailAction, null);

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Email rescheduled</DialogTitle>
          <DialogDescription>
            It will be sent at {utcMinute(state.data.scheduledAt).replace("T", " ")} UTC.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </>
    );
  }

  // Only rendered once the dialog opens (client-side), so reading the clock is safe here.
  const now = Date.now();
  return (
    // `contents` keeps header/panel/footer as direct flex children of the popup (coss ui pattern).
    <form action={formAction} className="contents">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="projectSlug" type="hidden" value={props.projectSlug} />
      <input name="envSlug" type="hidden" value={props.envSlug} />
      <input name="emailId" type="hidden" value={props.emailId} />
      <DialogHeader>
        <DialogTitle>Reschedule this email</DialogTitle>
        <DialogDescription>
          Choose when to send it instead, at most 30 days from now. The domain and the suppression
          list are still checked when it is sent.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Send at (UTC)</FieldLabel>
          <Input
            autoFocus
            defaultValue={utcMinute(props.scheduledAt)}
            max={utcMinute(new Date(now + MAX_AHEAD_MS).toISOString())}
            min={utcMinute(new Date(now).toISOString())}
            name="scheduledAt"
            required
            type="datetime-local"
          />
          <FieldDescription>Times are in UTC, like the rest of the dashboard.</FieldDescription>
        </Field>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Reschedule
        </Button>
      </DialogFooter>
    </form>
  );
}
