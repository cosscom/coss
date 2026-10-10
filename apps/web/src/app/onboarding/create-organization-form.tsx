"use client";

import { slugify, validateOrgSlug } from "@coss/auth/slugs";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormError } from "@/components/form-error";
import { authClient } from "@/lib/auth-client";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // Keep deriving the slug from the name until the user edits the slug themselves.
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slugError = validateOrgSlug(slug);
    if (slugError) {
      setError(slugError);
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.organization.create({ name: name.trim(), slug });
    if (error) {
      setError(error.message ?? "Could not create the organization.");
      setPending(false);
      return;
    }
    router.push(`/${slug}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an organization</CardTitle>
        <CardDescription>Organizations own projects, API keys and members.</CardDescription>
      </CardHeader>
      <CardPanel>
        {/* method="post": a submit before hydration must never put credentials in the URL. */}
        <form className="flex flex-col gap-4" method="post" onSubmit={onSubmit}>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              maxLength={64}
              name="name"
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              placeholder="Acme"
              required
              value={name}
            />
          </Field>
          <Field>
            <FieldLabel>URL slug</FieldLabel>
            <Input
              maxLength={48}
              name="slug"
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value.toLowerCase());
              }}
              placeholder="acme"
              required
              value={slug}
            />
            <FieldDescription>
              Lowercase letters, numbers and dashes. Your dashboard lives at /{slug || "acme"}.
            </FieldDescription>
          </Field>
          <FormError message={error} />
          <Button loading={pending} type="submit">
            Create organization
          </Button>
        </form>
      </CardPanel>
    </Card>
  );
}
