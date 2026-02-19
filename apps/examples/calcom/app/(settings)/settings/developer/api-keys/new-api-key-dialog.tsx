"use client";

import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyableField } from "../oauth/copyable-field";

type Step = "form" | "submitted";

interface NewApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewApiKeyDialog({ open, onOpenChange }: NewApiKeyDialogProps) {
  const [step, setStep] = useState<Step>("form");
  const [neverExpires, setNeverExpires] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");

  useEffect(() => {
    if (open) {
      setStep("form");
      setNeverExpires(false);
      setGeneratedKey("");
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneratedKey("cal_live_mock_api_key");
    setStep("submitted");
    e.currentTarget.reset();
  }

  const isFormStep = step === "form";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        {isFormStep ? (
          <Form className="contents" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Create a new API key to authenticate with the Cal.com API.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="grid gap-5">
              <Field>
                <FieldLabel>Personal note</FieldLabel>
                <Input
                  name="note"
                  placeholder="What is this key for?"
                  type="text"
                />
                <FieldDescription>
                  A personal note to help you identify this key.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Expiration date</FieldLabel>
                <Input disabled={neverExpires} name="expiresAt" type="date" />
                <FieldDescription>
                  The date this key will expire. Leave blank for 30 days from
                  now.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>
                  <Checkbox
                    checked={neverExpires}
                    onCheckedChange={(checked) =>
                      setNeverExpires(checked === true)
                    }
                  />
                  Never expires
                </FieldLabel>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </Form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Your new API key has been created. Copy it now — you won&apos;t
                be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-6">
              <CopyableField
                aria-label="API key"
                label="API Key"
                value={generatedKey}
              />
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertDescription>
                  This API key is shown only once. Copy it now — you won&apos;t
                  be able to view it again after closing this dialog.
                </AlertDescription>
              </Alert>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
