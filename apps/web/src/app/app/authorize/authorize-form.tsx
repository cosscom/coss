"use client";

import { Button } from "@coss/ui/components/button";
import { useActionState, useEffect } from "react";
import { FormError } from "@/components/form-error";
import { authorizeApp } from "./actions";

export function AuthorizeForm(props: { codeChallenge: string; state: string }) {
  const [result, action, pending] = useActionState(authorizeApp, null);
  useEffect(() => {
    // The app's browser sheet closes when it sees its own scheme.
    if (result?.ok) window.location.assign(result.data.url);
  }, [result]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="code_challenge" type="hidden" value={props.codeChallenge} />
      <input name="state" type="hidden" value={props.state} />
      <Button loading={pending || result?.ok} type="submit">
        Continue
      </Button>
      <FormError message={result && !result.ok ? result.error : null} />
    </form>
  );
}
