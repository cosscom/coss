"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogCreateHandle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import { KeyIcon, PlusIcon, UploadIcon } from "lucide-react";

const newOAuthClientDialog = DialogCreateHandle();

function NewOAuthClientTrigger({ variant }: { variant?: "outline" }) {
  return (
    <DialogTrigger
      handle={newOAuthClientDialog}
      render={<Button variant={variant} />}
    >
      <PlusIcon />
      New
    </DialogTrigger>
  );
}

function NewOAuthClientDialogRoot() {
  return (
    <Dialog handle={newOAuthClientDialog}>
      <DialogPopup className="sm:max-w-xl">
        <Form className="contents">
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
              <Input placeholder="My Oauth App" type="text" />
            </Field>

            <Field>
              <FieldLabel>Purpose</FieldLabel>
              <Textarea
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
              <Input placeholder="https://example.com/callback" type="url" />
              <FieldDescription>
                The URL where users will be redirected after authorization.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Website URL</FieldLabel>
              <Input placeholder="https://example.com" type="url" />
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

            <Field>
              <FieldLabel>Logo</FieldLabel>
              <div className="flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarFallback>
                    <KeyIcon className="size-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <Button size="sm" type="button" variant="outline">
                  <UploadIcon />
                  Upload logo
                </Button>
              </div>
            </Field>
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

export { NewOAuthClientTrigger, NewOAuthClientDialogRoot };
