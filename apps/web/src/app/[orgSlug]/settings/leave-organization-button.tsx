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
import { leaveOrganizationAction } from "./actions";

export function LeaveOrganizationButton(props: { orgSlug: string; orgName: string }) {
  // On success the action redirects away from this organization.
  const [state, formAction, pending] = useActionState(leaveOrganizationAction, null);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive-outline" />}>
        Leave organization
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {props.orgName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to its projects, domains and emails right away. API keys you
              created keep working. To come back, someone will have to invite you again.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Stay</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Leave organization
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
