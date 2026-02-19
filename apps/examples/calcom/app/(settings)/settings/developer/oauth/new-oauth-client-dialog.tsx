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
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { InfoIcon, KeyIcon, PlusIcon, UploadIcon } from "lucide-react";

export function NewOAuthClientDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <PlusIcon />
        New
      </DialogTrigger>
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
              <Input placeholder="My App" type="text" />
            </Field>

            <Field>
              <FieldLabel>
                Purpose
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex text-muted-foreground">
                        <InfoIcon className="size-4" />
                      </span>
                    }
                  />
                  <TooltipPopup>
                    Briefly describe what your application does and how it will
                    use the Cal.com API.
                  </TooltipPopup>
                </Tooltip>
              </FieldLabel>
              <Textarea
                placeholder="Describe how your application will use Cal.com..."
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel>Redirect URI</FieldLabel>
              <Input placeholder="https://example.com/callback" type="url" />
              <FieldDescription>
                The URL where users will be redirected after authorization.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>
                Website URL
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex text-muted-foreground">
                        <InfoIcon className="size-4" />
                      </span>
                    }
                  />
                  <TooltipPopup>
                    The public-facing URL of your application. This will be
                    shown to users during the authorization flow.
                  </TooltipPopup>
                </Tooltip>
              </FieldLabel>
              <Input placeholder="https://example.com" type="url" />
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
