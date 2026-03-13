"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Switch } from "@coss/ui/components/switch";
import { Textarea } from "@coss/ui/components/textarea";
import { KeyIcon } from "lucide-react";

export interface OAuthClientFormDefaults {
  clientName?: string;
  purpose?: string;
  redirectUri?: string;
  usePkce?: boolean;
  websiteUrl?: string;
}

interface OAuthClientFormFieldsProps {
  defaultValues?: OAuthClientFormDefaults;
  includeClientName?: boolean;
}

export function OAuthClientFormFields({
  defaultValues,
  includeClientName = true,
}: OAuthClientFormFieldsProps) {
  return (
    <>
      {includeClientName && (
        <Field>
          <FieldLabel>Client name</FieldLabel>
          <Input
            defaultValue={defaultValues?.clientName}
            name="clientName"
            placeholder="My OAuth App"
            type="text"
          />
        </Field>
      )}

      <Field>
        <FieldLabel>Purpose</FieldLabel>
        <Textarea
          defaultValue={defaultValues?.purpose}
          name="purpose"
          placeholder="Explain what this OAuth client is for and how it will be used"
          rows={3}
        />
        <FieldDescription>
          Please explain how and what this OAuth client will be used for. This
          helps us review and approve your request.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Redirect URI</FieldLabel>
        <Input
          defaultValue={defaultValues?.redirectUri}
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
          defaultValue={defaultValues?.websiteUrl}
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
          <Switch defaultChecked={defaultValues?.usePkce} />
          Use PKCE
        </FieldLabel>
        <FieldDescription>
          Proof Key for Code Exchange adds an extra layer of security for public
          clients such as mobile or single-page apps.
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
    </>
  );
}
