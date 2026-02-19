"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
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
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import { KeyIcon } from "lucide-react";
import type { FormEvent } from "react";
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
      clientId: "c9x7k2m4p9q1r3s5t8v0w2y4",
      clientSecret:
        "ddbec2e307affb39900d524ae0feaca7fb2edcacfa85705a3f1c2b4d6e8f0a2",
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
            <Field>
              <FieldLabel>Client name</FieldLabel>
              <Input name="clientName" placeholder="My Oauth App" type="text" />
            </Field>

            <Field>
              <FieldLabel>Purpose</FieldLabel>
              <Textarea
                name="purpose"
                placeholder="Explain what this OAuth client is for and how it will be used"
                rows={3}
              />
              <FieldDescription>
                Please explain how and what this OAuth client will be used for.
                This helps us review and approve your request.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Redirect URI</FieldLabel>
              <Input
                name="redirectUri"
                placeholder="https://example.com/callback"
                type="url"
              />
              <FieldDescription>
                The URL where users will be redirected after authorization.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Website URL</FieldLabel>
              <Input
                name="websiteUrl"
                placeholder="https://example.com"
                type="url"
              />
              <FieldDescription>
                For development, you can use a localhost URL (e.g.
                http://localhost:3000).
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>
                <Switch />
                Use PKCE
              </FieldLabel>
              <FieldDescription>
                Proof Key for Code Exchange adds an extra layer of security for
                public clients such as mobile or single-page apps.
              </FieldDescription>
            </Field>

            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="text-xl">
                  <KeyIcon className="size-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <Label className="text-sm">Logo</Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" type="button" variant="outline">
                    Upload logo
                  </Button>
                  <Button size="sm" type="button" variant="ghost">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
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
