"use client";

import { ORG_NAME_MAX_LENGTH } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { updateOrganizationAction } from "./actions";

export function OrganizationForm(props: { orgSlug: string; name: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, null);
  const [slug, setSlug] = useState(props.orgSlug);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          defaultValue={props.name}
          disabled={props.disabled}
          maxLength={ORG_NAME_MAX_LENGTH}
          name="name"
          required
        />
      </Field>
      <Field>
        <FieldLabel>URL slug</FieldLabel>
        <Input
          disabled={props.disabled}
          maxLength={48}
          name="slug"
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
          required
          value={slug}
        />
        <FieldDescription>
          {slug === props.orgSlug
            ? `Your dashboard lives at /${props.orgSlug}.`
            : `Your dashboard will move to /${slug || "…"}. Links and bookmarks to /${props.orgSlug} will stop working.`}
        </FieldDescription>
      </Field>
      {state?.ok ? (
        <p className="text-muted-foreground text-sm">Saved.</p>
      ) : (
        <FormError message={state?.error} />
      )}
      {props.disabled ? null : (
        <div>
          <Button loading={pending} type="submit">
            Save changes
          </Button>
        </div>
      )}
    </form>
  );
}
