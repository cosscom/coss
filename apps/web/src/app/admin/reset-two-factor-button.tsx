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
import { resetTwoFactorAction } from "./actions";

export function ResetTwoFactorButton(props: { userId: string; email: string }) {
  // On success the page re-renders without this button, which unmounts the dialog.
  const [state, formAction, pending] = useActionState(resetTwoFactorAction, null);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="xs" variant="outline" />}>
        Reset 2FA
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* `contents` keeps header/footer as direct flex children of the popup (coss ui pattern). */}
        <form action={formAction} className="contents">
          <input name="userId" type="hidden" value={props.userId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Reset two-factor for {props.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their authenticator app and backup codes stop working and their password alone signs
              them in. Only do this after confirming their identity. Organizations that require
              two-factor will ask them to set it up again.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Reset two-factor
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
