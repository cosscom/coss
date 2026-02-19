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
} from "@coss/ui/components/dialog";
import { Form } from "@coss/ui/components/form";
import type { FormEvent } from "react";
import { OAuthClientFormFields } from "./oauth-client-form-fields";
import type { OAuthClientSubmittedData } from "./oauth-client-submitted-dialog";

interface NewOAuthClientDialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSuccess: (data: OAuthClientSubmittedData) => void;
}

function NewOAuthClientDialogRoot({
  open,
  onOpenChange,
  onCreateSuccess,
}: NewOAuthClientDialogRootProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("clientName") as string) || "My OAuth App";
    onCreateSuccess({
      clientId: "cl_mock_1",
      clientSecret: "cs_mock_1",
      name,
    });
    form.reset();
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl">
        <Form className="contents" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create OAuth client</DialogTitle>
            <DialogDescription>
              Create a new OAuth client to allow third-party applications to
              access Cal.com on behalf of your users.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-5">
            <OAuthClientFormFields />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}

export { NewOAuthClientDialogRoot };
