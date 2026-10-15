"use client";

import { ORG_NAME_MAX_LENGTH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@coss/ui/components/input-group";
import { useActionState, useState } from "react";
import { SettingsFooter, SettingsRow } from "@/components/settings";
import { updateOrganizationAction } from "./actions";

/** The General section's card: name and URL slug rows, saved together from the footer. */
export function OrganizationForm(props: { orgSlug: string; name: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, null);
  const [name, setName] = useState(props.name);
  const [slug, setSlug] = useState(props.orgSlug);
  const dirty = name !== props.name || slug !== props.orgSlug;

  return (
    <form action={formAction}>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <SettingsRow
        description="Shown to members across the dashboard."
        label={<label htmlFor="organization-name">Name</label>}
      >
        <Input
          className="sm:w-72"
          disabled={props.disabled}
          id="organization-name"
          maxLength={ORG_NAME_MAX_LENGTH}
          name="name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </SettingsRow>
      <SettingsRow
        description="The first segment of every dashboard URL."
        label={<label htmlFor="organization-slug">URL</label>}
      >
        <InputGroup className="sm:w-72">
          <InputGroupAddon>
            <InputGroupText>coss.com/</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            disabled={props.disabled}
            id="organization-slug"
            maxLength={48}
            name="slug"
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            required
            value={slug}
          />
        </InputGroup>
      </SettingsRow>
      {props.disabled ? null : (
        <SettingsFooter
          hint={
            state && !state.ok ? (
              <span className="text-destructive-foreground">{state.error}</span>
            ) : slug !== props.orgSlug ? (
              `Links and bookmarks to /${props.orgSlug} will stop working.`
            ) : state?.ok && !dirty ? (
              "Saved."
            ) : null
          }
        >
          <Button disabled={!dirty} loading={pending} size="sm" type="submit">
            Save
          </Button>
        </SettingsFooter>
      )}
    </form>
  );
}
