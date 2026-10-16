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
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { createLogDrainAction } from "./actions";
import { SourceCheckboxes } from "./source-checkboxes";

type Target = { orgSlug: string; projectSlug: string; envSlug: string };

export function CreateDrainDialog(props: Target) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>Add log drain</DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also discards the shown secret. */}
        <CreateDrainForm {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function CreateDrainForm(props: Target) {
  const [state, formAction, pending] = useActionToast(createLogDrainAction, {
    success: "Log drain added",
  });

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Log drain added</DialogTitle>
          <DialogDescription>
            Verify requests with this signing secret (for example with{" "}
            <code>verifyLogDrainBatch</code> from the coss SDK). You can view it again on the
            drain's page.
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
                href={`/${props.orgSlug}/projects/${props.projectSlug}/${props.envSlug}/log-drains/${state.data.id}`}
              />
            }
          >
            View log drain
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
        <DialogTitle>Add a log drain</DialogTitle>
        <DialogDescription>
          coss.com posts batches of log lines to this URL as signed NDJSON, usually within seconds.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>URL</FieldLabel>
          <Input
            autoFocus
            name="url"
            placeholder="https://logs.example.com/coss"
            required
            type="url"
          />
          <FieldDescription>Must be https:// and publicly reachable.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Description</FieldLabel>
          <Input maxLength={256} name="description" placeholder="Optional" />
        </Field>
        <SourceCheckboxes />
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Add log drain
        </Button>
      </DialogFooter>
    </form>
  );
}
