"use client";

import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
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
import { Label } from "@coss/ui/components/label";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { createWebhookEndpointAction } from "./actions";

type Target = { orgSlug: string; projectSlug: string; envSlug: string };

export function CreateEndpointDialog(props: Target & { eventTypes: readonly string[] }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>Add endpoint</DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also discards the shown secret. */}
        <CreateEndpointForm {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function CreateEndpointForm(props: Target & { eventTypes: readonly string[] }) {
  const [state, formAction, pending] = useActionToast(createWebhookEndpointAction, {
    success: "Webhook endpoint added",
  });

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Endpoint added</DialogTitle>
          <DialogDescription>
            Verify requests with this signing secret (for example with <code>verifyWebhook</code>{" "}
            from the coss SDK). You can view it again on the endpoint's page.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          <code className="block select-all break-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
            {state.data.secret}
          </code>
          <div>
            <CopyButton label="Copy secret" value={state.data.secret} />
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button
            render={
              <Link
                href={`/${props.orgSlug}/projects/${props.projectSlug}/${props.envSlug}/webhooks/${state.data.id}`}
              />
            }
          >
            View endpoint
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    // `contents` keeps header/panel/footer as direct flex children of the popup (coss ui pattern).
    <form action={formAction} className="contents">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="projectSlug" type="hidden" value={props.projectSlug} />
      <input name="envSlug" type="hidden" value={props.envSlug} />
      <DialogHeader>
        <DialogTitle>Add a webhook endpoint</DialogTitle>
        <DialogDescription>
          COSS sends a signed POST request to this URL for each selected event.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>URL</FieldLabel>
          <Input
            autoFocus
            name="url"
            placeholder="https://example.com/webhooks/coss"
            required
            type="url"
          />
          <FieldDescription>Must be https:// and publicly reachable.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Input maxLength={256} name="description" placeholder="Optional" />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm">Events</legend>
          {props.eventTypes.map((type) => (
            <Label className="font-mono text-xs" key={type}>
              <Checkbox defaultChecked name="eventTypes" value={type} />
              {type}
            </Label>
          ))}
        </fieldset>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Add endpoint
        </Button>
      </DialogFooter>
    </form>
  );
}
