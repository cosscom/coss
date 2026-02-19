"use client";

import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
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
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyableField } from "./copyable-field";
import { OAuthClientFormFields } from "./oauth-client-form-fields";

interface OAuthClientSubmittedData {
  clientId: string;
  clientSecret: string;
  name: string;
}

type Step = "form" | "submitted";

interface NewOAuthClientDialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NewOAuthClientDialogRoot({
  open,
  onOpenChange,
}: NewOAuthClientDialogRootProps) {
  const [step, setStep] = useState<Step>("form");
  const [submittedData, setSubmittedData] =
    useState<OAuthClientSubmittedData | null>(null);

  useEffect(() => {
    if (open) {
      setStep("form");
      setSubmittedData(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("clientName") as string) || "My OAuth App";
    setSubmittedData({
      clientId: "cl_mock_1",
      clientSecret: "cs_mock_1",
      name,
    });
    setStep("submitted");
    form.reset();
  }

  const isFormStep = step === "form";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        {isFormStep ? (
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
        ) : (
          submittedData && (
            <>
              <DialogHeader>
                <DialogTitle>OAuth Client Submitted</DialogTitle>
                <DialogDescription>
                  Your OAuth client has been submitted for approval. You will
                  receive an email if it is approved or rejected. The OAuth
                  client can&apos;t be used unless approved.
                </DialogDescription>
              </DialogHeader>
              <DialogPanel className="flex flex-col gap-6">
                <div>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input disabled value={submittedData.name} />
                </Field>
                <CopyableField
                  aria-label="Client ID"
                  label="Client ID"
                  value={submittedData.clientId}
                />
                <CopyableField
                  aria-label="Client secret"
                  label="Client Secret"
                  value={submittedData.clientSecret}
                />
                <Alert variant="warning">
                  <TriangleAlertIcon />
                  <AlertDescription>
                    This client secret is shown only once. Copy it now — you
                    won&apos;t be able to view it again after closing this
                    dialog.
                  </AlertDescription>
                </Alert>
              </DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button />}>Done</DialogClose>
              </DialogFooter>
            </>
          )
        )}
      </DialogPopup>
    </Dialog>
  );
}

export { NewOAuthClientDialogRoot };
