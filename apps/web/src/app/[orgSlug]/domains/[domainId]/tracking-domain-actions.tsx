"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@coss/ui/components/alert-dialog";
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
import {
  addTrackingDomainAction,
  checkTrackingDomainAction,
  removeTrackingDomainAction,
} from "../actions";

type Target = { orgSlug: string; domainId: string };

function TargetInputs(props: Target) {
  return (
    <>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="domainId" type="hidden" value={props.domainId} />
    </>
  );
}

export function AddTrackingDomainDialog(props: Target & { domainName: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>Add tracking domain</DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also resets the form. */}
        <AddTrackingDomainForm {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function AddTrackingDomainForm(props: Target & { domainName: string }) {
  const [state, formAction, pending] = useActionState(addTrackingDomainAction, null);

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Tracking domain added</DialogTitle>
          <DialogDescription>
            Publish its CNAME record at your DNS provider. Emails switch to it once it is active.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    // `contents` keeps header/panel/footer as direct flex children of the popup (coss ui pattern).
    <form action={formAction} className="contents">
      <TargetInputs {...props} />
      <DialogHeader>
        <DialogTitle>Add a tracking domain</DialogTitle>
        <DialogDescription>
          Open and click tracking links in emails from {props.domainName} will use this hostname
          instead of COSS&apos;s, once its CNAME record is published.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Hostname</FieldLabel>
          <Input autoFocus defaultValue={`links.${props.domainName}`} name="hostname" required />
          <FieldDescription>
            A subdomain of {props.domainName} that you don&apos;t use for anything else.
          </FieldDescription>
        </Field>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Add tracking domain
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CheckTrackingDomainButton(props: Target & { restart: boolean }) {
  const [state, formAction, pending] = useActionState(checkTrackingDomainAction, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <TargetInputs {...props} />
      <Button loading={pending} size="sm" type="submit" variant="outline">
        {props.restart ? "Restart setup" : "Check now"}
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function RemoveTrackingDomainButton(props: Target & { hostname: string }) {
  const [state, formAction, pending] = useActionState(removeTrackingDomainAction, null);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Remove
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <TargetInputs {...props} />
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {props.hostname}?</AlertDialogTitle>
            <AlertDialogDescription>
              New emails will use COSS&apos;s tracking host. Tracked links and open pixels in emails
              already sent through {props.hostname} will stop working.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Remove tracking domain
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
