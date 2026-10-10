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
import { FormError } from "@/components/form-error";
import { deleteDomainAction, verifyDomainAction } from "../actions";

type Target = { orgSlug: string; domainId: string };

export function VerifyDomainButton(props: Target & { restart: boolean }) {
  const [state, formAction, pending] = useActionState(verifyDomainAction, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="domainId" type="hidden" value={props.domainId} />
      <Button loading={pending} size="sm" type="submit" variant="outline">
        {props.restart ? "Restart verification" : "Verify now"}
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function DeleteDomainButton(props: Target & { name: string }) {
  // On success the action redirects to the domain list.
  const [state, formAction, pending] = useActionState(deleteDomainAction, null);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <input name="domainId" type="hidden" value={props.domainId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {props.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Live API keys will no longer be able to send from this domain. Emails already sent are
              not affected. Adding it again means publishing new DKIM records.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Delete domain
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
