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
import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { FormError } from "@/components/form-error";
import {
  deleteWebhookEndpointAction,
  retryWebhookDeliveryAction,
  revealWebhookSecretAction,
  setWebhookEndpointEnabledAction,
  upgradeWebhookEndpointVersionAction,
} from "../actions";

type Target = { orgSlug: string; projectSlug: string; envSlug: string; endpointId: string };

function TargetInputs(props: Target) {
  return (
    <>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="projectSlug" type="hidden" value={props.projectSlug} />
      <input name="envSlug" type="hidden" value={props.envSlug} />
      <input name="endpointId" type="hidden" value={props.endpointId} />
    </>
  );
}

export function ToggleEndpointButton(props: Target & { enabled: boolean }) {
  const [state, formAction, pending] = useActionState(setWebhookEndpointEnabledAction, null);
  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <TargetInputs {...props} />
      <input name="enabled" type="hidden" value={String(!props.enabled)} />
      <Button loading={pending} size="sm" type="submit" variant="outline">
        {props.enabled ? "Disable" : "Enable"}
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function UpgradeEndpointVersionButton(props: Target & { latest: string }) {
  const [state, formAction, pending] = useActionState(upgradeWebhookEndpointVersionAction, null);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
        Upgrade to {props.latest}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <TargetInputs {...props} />
          <input name="apiVersion" type="hidden" value={props.latest} />
          <AlertDialogHeader>
            <AlertDialogTitle>Send events in API version {props.latest}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every event from now on, including pending retries, is rendered in the new version.
              Make sure your receiver handles it first: the API changelog lists what changed.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit">
              Upgrade
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

export function DeleteEndpointButton(props: Target & { url: string }) {
  // On success the action redirects to the endpoint list.
  const [state, formAction, pending] = useActionState(deleteWebhookEndpointAction, null);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <TargetInputs {...props} />
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              {props.url} will stop receiving events, including pending retries. This can't be
              undone.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Delete endpoint
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

export function RevealSecret(props: Target) {
  const [state, formAction, pending] = useActionState(revealWebhookSecretAction, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col gap-2">
        <code className="block select-all break-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
          {state.data.secret}
        </code>
        <div>
          <CopyButton label="Copy secret" value={state.data.secret} />
        </div>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <TargetInputs {...props} />
      <Button loading={pending} size="sm" type="submit" variant="outline">
        Reveal signing secret
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function RetryDeliveryButton(props: Target & { deliveryId: string }) {
  const [state, formAction, pending] = useActionState(retryWebhookDeliveryAction, null);
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <TargetInputs {...props} />
      <input name="deliveryId" type="hidden" value={props.deliveryId} />
      <Button loading={pending} size="xs" type="submit" variant="outline">
        Retry
      </Button>
      {state && !state.ok ? (
        <span className="text-destructive-foreground text-xs">{state.error}</span>
      ) : null}
    </form>
  );
}
