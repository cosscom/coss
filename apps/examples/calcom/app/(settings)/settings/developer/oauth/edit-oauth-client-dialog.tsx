"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
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
import { useState } from "react";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: OAuthClientItem | null;
}

export function EditOAuthClientDialog({
  open,
  onOpenChange,
  client,
}: EditOAuthClientDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!client) return null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl">
        <Form className="contents">
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
              <Input defaultValue={client.name} name="clientName" type="text" />
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

            <div>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                type="button"
                variant="destructive-outline"
              >
                Delete OAuth client
              </Button>
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </Form>

        <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete OAuth client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this OAuth client? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>
                Cancel
              </AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive">Delete</Button>}
              />
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </DialogPopup>
    </Dialog>
  );
}
