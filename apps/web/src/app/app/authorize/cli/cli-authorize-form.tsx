"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { useActionState, useEffect } from "react";
import { CopyButton } from "@/components/copy-button";
import { FormError } from "@/components/form-error";
import { authorizeCli } from "./actions";

export type EnvironmentOption = { value: string; label: string; live: boolean };

export function CliAuthorizeForm(props: {
  codeChallenge: string;
  state: string;
  port: number | null;
  environments: EnvironmentOption[];
  defaultEnvironment: string;
  defaultName: string;
  maxNameLength: number;
}) {
  const [result, action, pending] = useActionState(authorizeCli, null);
  const redirectUrl = result?.ok && result.data.kind === "redirect" ? result.data.url : null;
  useEffect(() => {
    // Back to the CLI's loopback server, which finishes the sign-in in the terminal.
    if (redirectUrl) window.location.assign(redirectUrl);
  }, [redirectUrl]);

  if (result?.ok && result.data.kind === "code") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">Paste this code into your terminal:</p>
        <code className="break-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
          {result.data.code}
        </code>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            It works once, until {new Date(result.data.expiresAt).toLocaleTimeString()}.
          </span>
          <CopyButton value={result.data.code} />
        </div>
      </div>
    );
  }
  if (redirectUrl) {
    return <p className="text-sm">Approved. Return to your terminal; you can close this tab.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="code_challenge" type="hidden" value={props.codeChallenge} />
      <input name="state" type="hidden" value={props.state} />
      {props.port === null ? (
        <input name="mode" type="hidden" value="code" />
      ) : (
        <input name="port" type="hidden" value={props.port} />
      )}
      <Field>
        <FieldLabel>Environment</FieldLabel>
        <Select
          defaultValue={props.defaultEnvironment}
          items={props.environments}
          name="environment"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {props.environments.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <FieldDescription>
          The CLI gets a new API key of this environment. Live keys send real email.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Key name</FieldLabel>
        <Input defaultValue={props.defaultName} maxLength={props.maxNameLength} name="name" />
      </Field>
      <Button loading={pending} type="submit">
        Authorize
      </Button>
      <FormError message={result && !result.ok ? result.error : null} />
    </form>
  );
}
