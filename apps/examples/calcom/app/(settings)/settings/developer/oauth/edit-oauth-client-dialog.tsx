"use client";

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
import { CopyableField } from "./copyable-field";
import { OAuthClientFormFields } from "./oauth-client-form-fields";
import type { OAuthClientItem } from "./oauth-clients-list";

const statusVariantMap = {
  approved: "success",
  pending: "warning",
  rejected: "error",
} as const;

const statusLabelMap = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
} as const;

interface EditOAuthClientDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  client: OAuthClientItem | null;
}

export function EditOAuthClientDialog({
  onOpenChange,
  open,
  client,
}: EditOAuthClientDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open && !!client}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        {client && (
          <Form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit OAuth client</DialogTitle>
              <DialogDescription>
                View and manage your OAuth client settings.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="grid gap-5">
              <div>
                <Badge variant={statusVariantMap[client.status]}>
                  {statusLabelMap[client.status]}
                </Badge>
              </div>

              <CopyableField
                aria-label="Client ID"
                label="Client ID"
                value={client.clientId}
              />

              <Field>
                <FieldLabel>Client name</FieldLabel>
                <Input
                  defaultValue={client.name}
                  name="clientName"
                  type="text"
                />
              </Field>

              <OAuthClientFormFields
                defaultValues={{
                  purpose: client.purpose,
                  redirectUri: client.redirectUri,
                  usePkce: client.usePkce,
                  websiteUrl: client.websiteUrl,
                }}
                includeClientName={false}
              />
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </Form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
