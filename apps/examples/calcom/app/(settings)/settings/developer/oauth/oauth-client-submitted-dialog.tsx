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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";

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

function CopyableField({
  label,
  value,
  "aria-label": ariaLabel,
}: {
  label: string;
  value: string;
  "aria-label": string;
}) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-label={ariaLabel}
          className="font-mono"
          readOnly
          value={value}
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={`Copy ${label}`}
                  onClick={() => copyToClipboard(value)}
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </TooltipTrigger>
            <TooltipPopup>
              <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
            </TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
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
