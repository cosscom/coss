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
import { Input } from "@coss/ui/components/input";
import { TriangleAlertIcon } from "lucide-react";
import { CopyableField } from "./copyable-field";

export interface OAuthClientSubmittedData {
  name: string;
  clientId: string;
  clientSecret: string;
}

interface OAuthClientSubmittedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OAuthClientSubmittedData | null;
}

export function OAuthClientSubmittedDialog({
  open,
  onOpenChange,
  data,
}: OAuthClientSubmittedDialogProps) {
  if (!data) return null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl">
        <DialogHeader>
          <DialogTitle>OAuth Client Submitted</DialogTitle>
          <DialogDescription>
            Your OAuth client has been submitted for approval. You will receive
            an email if it is approved or rejected. The OAuth client can&apos;t
            be used unless approved.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-6">
          <div>
            <Badge variant="warning">Pending</Badge>
          </div>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input disabled value={data.name} />
          </Field>
          <CopyableField
            aria-label="Client ID"
            label="Client ID"
            value={data.clientId}
          />
          <CopyableField
            aria-label="Client secret"
            label="Client Secret"
            value={data.clientSecret}
          />
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertDescription>
              This client secret is shown only once. Copy it now — you
              won&apos;t be able to view it again after closing this dialog.
            </AlertDescription>
          </Alert>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
