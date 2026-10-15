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
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { deleteDomainAction, type VerifyOutcome, verifyDomainAction } from "../actions";

type Target = { orgSlug: string; domainId: string };

export function VerifyDomainButton(props: Target & { restart: boolean }) {
  const [, formAction, pending] = useActionToast(verifyDomainAction, {
    success: domainCheckToast,
    errors: "toast",
  });

  return (
    <form action={formAction}>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="domainId" type="hidden" value={props.domainId} />
      <Button loading={pending} size="sm" type="submit" variant="outline">
        {props.restart ? "Restart verification" : "Verify now"}
      </Button>
    </form>
  );
}

/** A check that finds nothing new is still worth saying: the page itself may not change. */
function domainCheckToast({ status, restarted }: VerifyOutcome) {
  if (restarted) return "Verification restarted";
  if (status === "verified") return "Domain verified";
  return {
    type: status === "temporary_failure" ? "warning" : "info",
    title:
      status === "temporary_failure"
        ? "Some DNS records stopped resolving"
        : "DNS records not found yet",
    description: "We keep checking automatically; DNS changes can take a while to spread.",
  } as const;
}

export function DeleteDomainButton(props: Target & { name: string }) {
  // On success the action redirects to the domain list.
  const [state, formAction, pending] = useActionToast(deleteDomainAction, {
    success: `${props.name} deleted`,
  });

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
