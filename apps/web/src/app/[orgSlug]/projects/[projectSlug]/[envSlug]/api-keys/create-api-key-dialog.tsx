"use client";

import { API_KEY_NAME_MAX_LENGTH } from "@coss/auth/constants";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import { PlusIcon } from "lucide-react";
import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { FormError } from "@/components/form-error";
import { createApiKeyAction } from "./actions";

type Target = { orgSlug: string; projectSlug: string; envSlug: string };

export function CreateApiKeyDialog(props: Target & { environmentName: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Create API key
      </DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also discards the shown key and form state. */}
        <CreateApiKeyForm {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function CreateApiKeyForm(props: Target & { environmentName: string }) {
  const [state, formAction, pending] = useActionState(createApiKeyAction, null);

  if (state?.ok) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Save your API key</DialogTitle>
          <DialogDescription>
            Copy “{state.data.name}” now. For security it won't be shown again.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          <code className="block select-all break-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
            {state.data.key}
          </code>
          <div>
            <CopyButton label="Copy key" value={state.data.key} />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
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
        <DialogTitle>Create API key</DialogTitle>
        <DialogDescription>
          The key can send and read emails in the {props.environmentName} environment.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            autoFocus
            maxLength={API_KEY_NAME_MAX_LENGTH}
            name="name"
            placeholder="e.g. Backend server"
            required
          />
          <FieldDescription>Up to {API_KEY_NAME_MAX_LENGTH} characters.</FieldDescription>
        </Field>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Create key
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Shown instead of the dialog when the session may not create keys here. */
export function CreateApiKeyUnavailable({ reason }: { reason: string }) {
  return (
    <Alert variant="warning">
      <AlertDescription>{reason}</AlertDescription>
    </Alert>
  );
}
