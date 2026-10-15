"use client";

import { Button } from "@coss/ui/components/button";
import { EyeIcon } from "lucide-react";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import { Panel, PanelBody } from "@/components/panel";
import { UNTRUSTED_PREVIEW_HEAD } from "@/lib/email-preview";
import { revealEmailContentAction } from "../actions";

/** The email's HTML and text, loaded (and audited) only when the admin asks for them. */
export function EmailContent({ emailId }: { emailId: string }) {
  const [state, formAction, pending] = useActionState(revealEmailContentAction, null);
  if (!state?.ok) {
    return (
      <Panel
        description="Viewing a customer's email is recorded in the admin audit log."
        title="Content"
      >
        <PanelBody>
          <form action={formAction} className="flex flex-col items-start gap-2">
            <input name="emailId" type="hidden" value={emailId} />
            <Button loading={pending} size="sm" type="submit" variant="outline">
              <EyeIcon />
              Show content
            </Button>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </form>
        </PanelBody>
      </Panel>
    );
  }
  const { html, text } = state.data;
  return (
    <>
      {html !== null ? (
        <Panel description="Remote images and fonts are not loaded." title="HTML">
          <PanelBody className="p-2">
            {/* Nothing remote loads: the sender must not learn that an admin opened it. */}
            <iframe
              className="h-[600px] w-full rounded-lg border bg-white"
              referrerPolicy="no-referrer"
              sandbox=""
              srcDoc={UNTRUSTED_PREVIEW_HEAD + html}
              title="Email preview"
            />
          </PanelBody>
        </Panel>
      ) : null}
      {text !== null ? (
        <Panel title="Text">
          <PanelBody>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.8125rem] leading-relaxed">
              {text}
            </pre>
          </PanelBody>
        </Panel>
      ) : null}
      {html === null && text === null ? (
        <Panel title="Content">
          <PanelBody className="text-muted-foreground text-sm">
            No content stored: internal emails discard theirs once they leave the queue.
          </PanelBody>
        </Panel>
      ) : null}
    </>
  );
}
