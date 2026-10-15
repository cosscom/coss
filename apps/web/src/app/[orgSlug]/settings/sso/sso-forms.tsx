"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@coss/ui/components/alert-dialog";
import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Textarea } from "@coss/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@coss/ui/components/toggle-group";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import { deleteSsoProviderAction, saveSsoProviderAction, setSsoRequirementAction } from "./actions";

type ProviderType = "oidc" | "saml";

export type SsoProviderFormValues = {
  type: ProviderType;
  domains: string[];
  oidc: { issuer: string; clientId: string } | null;
  saml: { entryPoint: string; idpEntityId: string | null; usesMetadata: boolean } | null;
};

/** Creates or updates the organization's provider. Secrets are never sent back to the form. */
export function SsoProviderForm(props: {
  orgSlug: string;
  /** Verified email domains of the organization, plus any domain the provider already lists. */
  domainOptions: string[];
  current: SsoProviderFormValues | null;
}) {
  const editing = props.current !== null;
  const [state, formAction, pending] = useActionToast(saveSsoProviderAction, {
    success: editing ? "SSO provider saved" : "SSO provider added",
  });
  const [type, setType] = useState<ProviderType>(props.current?.type ?? "oidc");
  const selected = new Set(props.current?.domains ?? []);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="type" type="hidden" value={type} />
      {editing ? null : (
        <Field>
          <FieldLabel>Protocol</FieldLabel>
          <ToggleGroup
            onValueChange={(value) => {
              const next = value[0];
              if (next === "oidc" || next === "saml") setType(next);
            }}
            value={[type]}
            variant="outline"
          >
            <ToggleGroupItem value="oidc">OpenID Connect</ToggleGroupItem>
            <ToggleGroupItem value="saml">SAML 2.0</ToggleGroupItem>
          </ToggleGroup>
        </Field>
      )}

      {type === "oidc" ? (
        <>
          <Field>
            <FieldLabel>Issuer URL</FieldLabel>
            <Input
              defaultValue={props.current?.oidc?.issuer ?? ""}
              name="oidcIssuer"
              placeholder="https://acme.okta.com"
              required
              type="url"
            />
            <FieldDescription>
              We read its /.well-known/openid-configuration. Must be public and https://.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Client ID</FieldLabel>
            <Input
              autoComplete="off"
              defaultValue={props.current?.oidc?.clientId ?? ""}
              name="oidcClientId"
              required
            />
          </Field>
          <Field>
            <FieldLabel>Client secret</FieldLabel>
            <Input
              autoComplete="off"
              name="oidcClientSecret"
              placeholder={editing ? "Leave empty to keep the current secret" : undefined}
              required={!editing}
              type="password"
            />
          </Field>
        </>
      ) : (
        <>
          <Field>
            <FieldLabel>IdP metadata XML</FieldLabel>
            <Textarea
              className="font-mono text-xs"
              name="samlMetadata"
              placeholder={
                props.current?.saml?.usesMetadata
                  ? "Leave empty to keep the current metadata"
                  : '<md:EntityDescriptor entityID="…">'
              }
              rows={6}
              spellCheck={false}
            />
            <FieldDescription>
              Preferred. Or leave it empty and fill in the three fields below instead.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>SSO URL</FieldLabel>
            <Input
              defaultValue={
                props.current?.saml?.usesMetadata ? "" : props.current?.saml?.entryPoint
              }
              name="samlEntryPoint"
              placeholder="https://acme.okta.com/app/…/sso/saml"
              type="url"
            />
          </Field>
          <Field>
            <FieldLabel>IdP entity ID (issuer)</FieldLabel>
            <Input
              defaultValue={props.current?.saml?.idpEntityId ?? ""}
              name="samlIdpEntityId"
              placeholder="http://www.okta.com/exk…"
            />
          </Field>
          <Field>
            <FieldLabel>Signing certificate</FieldLabel>
            <Textarea
              className="font-mono text-xs"
              name="samlCertificate"
              placeholder="-----BEGIN CERTIFICATE-----"
              rows={4}
              spellCheck={false}
            />
          </Field>
        </>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium text-sm">Domains</legend>
        {props.domainOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No verified domains yet. Add and verify one under Domains first.
          </p>
        ) : (
          props.domainOptions.map((domain) => (
            <Label key={domain}>
              <Checkbox defaultChecked={selected.has(domain)} name="domains" value={domain} />
              {domain}
            </Label>
          ))
        )}
        <p className="text-muted-foreground text-sm">
          People with an address at these domains sign in through this provider.
        </p>
      </fieldset>

      {state && !state.ok ? <FormError message={state.error} /> : null}
      <div>
        <Button disabled={props.domainOptions.length === 0} loading={pending} type="submit">
          {editing ? "Save changes" : "Save provider"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteSsoProviderButton(props: { orgSlug: string }) {
  // On success the page re-renders without a provider, which unmounts this dialog.
  const [state, formAction, pending] = useActionToast(deleteSsoProviderAction, {
    success: "SSO provider removed",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Remove provider
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <form action={formAction} className="contents">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the SSO provider?</AlertDialogTitle>
            <AlertDialogDescription>
              Nobody will be able to sign in with SSO, the SSO requirement is turned off, every
              account's link to this provider is deleted and everyone signed in with it (you too, if
              you did) is signed out. Members without a password can set one with “Forgot password”.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Remove provider
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Turns the organization's SSO requirement on or off (owners only). */
export function SsoRequirementForm(props: {
  orgSlug: string;
  required: boolean;
  /** Every precondition for turning it on holds (the action re-checks them). */
  canRequire: boolean;
}) {
  const [state, formAction, pending] = useActionToast(setSsoRequirementAction, {
    success: props.required ? "SSO no longer required" : "SSO now required",
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="required" type="hidden" value={String(!props.required)} />
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <div>
        <Button
          disabled={!props.required && !props.canRequire}
          loading={pending}
          size="sm"
          type="submit"
          variant={props.required ? "outline" : "default"}
        >
          {props.required ? "Stop requiring SSO" : "Require SSO"}
        </Button>
      </div>
    </form>
  );
}
