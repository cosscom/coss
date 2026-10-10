"use client";

import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { createProjectAction } from "./actions";

export function CreateProjectForm({ orgSlug }: { orgSlug: string }) {
  const [state, formAction, pending] = useActionState(createProjectAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name="orgSlug" type="hidden" value={orgSlug} />
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Project name"
          className="max-w-xs"
          maxLength={64}
          name="name"
          placeholder="Project name"
          required
        />
        <Button loading={pending} type="submit">
          Create project
        </Button>
      </div>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}
