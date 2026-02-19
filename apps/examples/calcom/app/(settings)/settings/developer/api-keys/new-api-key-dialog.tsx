"use client";

import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Switch } from "@coss/ui/components/switch";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";
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
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>
                API keys allow you to make API calls for your own account.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="grid gap-6">
              <Alert variant="info">
                <InfoIcon />
                <AlertDescription>
                  Here we can say something about OAuth with a link to the docs.
                </AlertDescription>
              </Alert>
              <Field>
                <FieldLabel>Name this key</FieldLabel>
                <Input name="note" placeholder="E.g. Development" type="text" />
              </Field>

              <Collapsible
                onOpenChange={(open) => setNeverExpires(!open)}
                open={!neverExpires}
              >
                <Field>
                  <FieldLabel>
                    <CollapsibleTrigger
                      nativeButton={false}
                      render={
                        <Switch
                          checked={neverExpires}
                          onCheckedChange={(checked) =>
                            setNeverExpires(checked === true)
                          }
                        />
                      }
                    />
                    Never expires
                  </FieldLabel>
                </Field>
                <CollapsiblePanel>
                  <Field className="mt-4">
                    <FieldLabel>Expiration</FieldLabel>
                    <Select
                      aria-label="Expiration"
                      defaultValue="30d"
                      items={[
                        { label: "7 days", value: "7d" },
                        { label: "30 days", value: "30d" },
                        { label: "3 months", value: "3m" },
                        { label: "1 year", value: "1y" },
                      ]}
                      name="expiresAt"
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectItem value="7d">7 days</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="3m">3 months</SelectItem>
                        <SelectItem value="1y">1 year</SelectItem>
                      </SelectPopup>
                    </Select>
                    <FieldDescription>
                      The API key will expire on 21-03-2026
                    </FieldDescription>
                  </Field>
                </CollapsiblePanel>
              </Collapsible>
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
              <DialogTitle>API key created successfully</DialogTitle>
              <DialogDescription>
                Your new API key has been created. Copy it now — you won&apos;t
                be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-6">
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>Save this API key somewhere safe</AlertTitle>
                <AlertDescription>
                  You will not be able to view it again once you close this
                  modal.
                </AlertDescription>
              </Alert>
              <CopyableField
                aria-label="API key"
                description="Expires 2/19/2027"
                label="API Key"
                value={generatedKey}
              />
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
