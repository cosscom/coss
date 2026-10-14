"use client";

import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import {
  addReceivingDomainAction,
  checkReceivingDomainAction,
  removeReceivingDomainAction,
} from "../actions";

type Target = { orgSlug: string; domainId: string };

export type EnvironmentOption = { value: string; label: string };

function TargetInputs(props: Target) {
  return (
    <>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="domainId" type="hidden" value={props.domainId} />
    </>
  );
}

export function AddReceivingDomainDialog(
  props: Target & { domainName: string; environments: EnvironmentOption[] },
) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>Receive email</DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also resets the form. */}
        <AddReceivingDomainForm {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function AddReceivingDomainForm(
  props: Target & { domainName: string; environments: EnvironmentOption[] },
) {
  const [state, formAction, pending] = useActionState(addReceivingDomainAction, null);
  const [hostname, setHostname] = useState(`inbound.${props.domainName}`);

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Receiving set up</DialogTitle>
          <DialogDescription>
            Publish its MX record at your DNS provider. Email to any address at {hostname} is then
            received by the environment you chose.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </>
    );
  }

  const apex = hostname.trim().toLowerCase().replace(/\.$/, "") === props.domainName;
  return (
    // `contents` keeps header/panel/footer as direct flex children of the popup (coss ui pattern).
    <form action={formAction} className="contents">
      <TargetInputs {...props} />
      <DialogHeader>
        <DialogTitle>Receive email</DialogTitle>
        <DialogDescription>
          Email sent to any address at this hostname becomes a received email of the environment: an{" "}
          <code>email.received</code> webhook, and the email in the dashboard and the API.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Hostname</FieldLabel>
          <Input
            autoFocus
            name="hostname"
            onChange={(event) => setHostname(event.target.value)}
            required
            value={hostname}
          />
          <FieldDescription>
            {props.domainName} itself, or a subdomain of it that has no mail server of its own.
          </FieldDescription>
        </Field>
        {apex ? (
          <Alert variant="warning">
            <AlertDescription>
              Pointing {props.domainName}&apos;s MX at COSS moves all of its mail here, including
              your team&apos;s mailboxes. Use a subdomain unless that is what you want.
            </AlertDescription>
          </Alert>
        ) : null}
        <Field>
          <FieldLabel>Environment</FieldLabel>
          <Select
            defaultValue={props.environments[0]?.value}
            items={props.environments}
            name="environmentId"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {props.environments.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <FieldDescription>Its webhooks and API keys see the received emails.</FieldDescription>
        </Field>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Receive email
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CheckReceivingDomainButton(props: Target) {
  const [state, formAction, pending] = useActionState(checkReceivingDomainAction, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <TargetInputs {...props} />
      <Button loading={pending} size="sm" type="submit" variant="outline">
        Check now
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function RemoveReceivingDomainButton(props: Target & { hostname: string }) {
  const [state, formAction, pending] = useActionState(removeReceivingDomainAction, null);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Stop receiving
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <TargetInputs {...props} />
          <AlertDialogHeader>
            <AlertDialogTitle>Stop receiving at {props.hostname}?</AlertDialogTitle>
            <AlertDialogDescription>
              Email sent to {props.hostname} from now on is dropped. Remove its MX record too.
              Emails already received are kept until their retention period ends.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Stop receiving
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
