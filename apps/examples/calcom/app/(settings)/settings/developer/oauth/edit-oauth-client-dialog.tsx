"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
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
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon, KeyIcon } from "lucide-react";
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

            <Field>
              <FieldLabel>Client name</FieldLabel>
              <Input defaultValue={client.name} name="clientName" type="text" />
            </Field>

            <CopyableField
              aria-label="Client ID"
              label="Client ID"
              value={client.clientId}
            />

            <CopyableField
              aria-label="Client secret"
              label="Client Secret"
              value={client.clientSecret}
            />

            <Field>
              <FieldLabel>Purpose</FieldLabel>
              <Textarea
                defaultValue={client.purpose}
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
                defaultValue={client.redirectUri}
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
                defaultValue={client.websiteUrl}
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
                <Switch defaultChecked={client.usePkce} />
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
            <Button type="submit">Save</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
