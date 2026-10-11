"use client";

import type { ReputationPolicy } from "@coss/reputation/schemas";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Checkbox } from "@coss/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Textarea } from "@coss/ui/components/textarea";
import { useActionState, useEffect, useState } from "react";
import { FormError } from "@/components/form-error";
import type { ActionResult } from "@/lib/action-result";
import {
  reinstateOrganizationAction,
  suspendOrganizationAction,
  updatePolicyAction,
} from "./actions";

type NoteAction = (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;

type NoteDialogProps = {
  organizationId: string;
  action: NoteAction;
  trigger: string;
  title: string;
  description: string;
  submit: string;
  destructive?: boolean;
};

function NoteDialog(props: NoteDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button size="sm" variant={props.destructive ? "destructive-outline" : "default"} />
        }
      >
        {props.trigger}
      </DialogTrigger>
      <DialogPopup>
        {/* The popup unmounts when closed, which also resets the form state. */}
        <NoteForm {...props} onDone={() => setOpen(false)} />
      </DialogPopup>
    </Dialog>
  );
}

function NoteForm(props: NoteDialogProps & { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(props.action, null);
  const { onDone } = props;

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    // `contents` keeps header/panel/footer as direct flex children of the popup (coss ui pattern).
    <form action={formAction} className="contents">
      <input name="organizationId" type="hidden" value={props.organizationId} />
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.description}</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Note</FieldLabel>
          <Textarea maxLength={2000} name="note" required />
          <FieldDescription>Kept in the organization's history (admins only).</FieldDescription>
        </Field>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button
          loading={pending}
          type="submit"
          variant={props.destructive ? "destructive" : "default"}
        >
          {props.submit}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ReinstateButton({ organizationId }: { organizationId: string }) {
  return (
    <NoteDialog
      action={reinstateOrganizationAction}
      description="Live sending resumes immediately. Rates are measured again from now on, so the sending that caused the suspension can't suspend the organization again."
      organizationId={organizationId}
      submit="Reinstate"
      title="Reinstate this organization?"
      trigger="Reinstate"
    />
  );
}

export function SuspendButton({ organizationId }: { organizationId: string }) {
  return (
    <NoteDialog
      action={suspendOrganizationAction}
      description="Live sends are refused with account_suspended and new live keys can't be created until an admin reinstates the organization. Sandbox keys keep working. The organization's live webhook endpoints receive account.suspended."
      destructive
      organizationId={organizationId}
      submit="Suspend"
      title="Suspend live sending?"
      trigger="Suspend"
    />
  );
}

const percent = (rate: number) => String(Number((rate * 100).toFixed(4)));

/**
 * Per-organization policy overrides. Empty fields use the default (shown as the placeholder);
 * `current` is the stored overrides' effect, so a saved value shows as the field's value.
 */
export function PolicyForm(props: {
  organizationId: string;
  defaults: ReputationPolicy;
  overrides: Partial<{
    windowDays: number;
    bounceRate: Partial<ReputationPolicy["bounceRate"]>;
    complaintRate: Partial<ReputationPolicy["complaintRate"]>;
    countSimulatorRecipients: boolean;
    contentScreening: Partial<ReputationPolicy["contentScreening"]>;
  }> | null;
}) {
  const [state, formAction, pending] = useActionState(updatePolicyAction, null);
  const { defaults } = props;
  const overrides = props.overrides ?? {};
  const rateFields = [
    [
      "bounceWarning",
      "Bounce warning (%)",
      defaults.bounceRate.warning,
      overrides.bounceRate?.warning,
    ],
    [
      "bounceSuspend",
      "Bounce suspension (%)",
      defaults.bounceRate.suspend,
      overrides.bounceRate?.suspend,
    ],
    [
      "complaintWarning",
      "Complaint warning (%)",
      defaults.complaintRate.warning,
      overrides.complaintRate?.warning,
    ],
    [
      "complaintSuspend",
      "Complaint suspension (%)",
      defaults.complaintRate.suspend,
      overrides.complaintRate?.suspend,
    ],
    [
      "screeningFlag",
      "Content screening flag (%)",
      defaults.contentScreening.flagThreshold,
      overrides.contentScreening?.flagThreshold,
    ],
    [
      "screeningBlock",
      "Content screening block (%)",
      defaults.contentScreening.blockThreshold,
      overrides.contentScreening?.blockThreshold,
    ],
    [
      "screeningSample",
      "Content screening sample (%)",
      defaults.contentScreening.sampleRate,
      overrides.contentScreening?.sampleRate,
    ],
  ] as const;
  const countFields = [
    ["windowDays", "Window (days)", defaults.windowDays, overrides.windowDays],
    [
      "bounceMinimum",
      "Bounce minimum recipients",
      defaults.bounceRate.minimumRecipients,
      overrides.bounceRate?.minimumRecipients,
    ],
    [
      "complaintMinimum",
      "Complaint minimum recipients",
      defaults.complaintRate.minimumRecipients,
      overrides.complaintRate?.minimumRecipients,
    ],
    [
      "screeningFirst",
      "Always screen the first (messages)",
      defaults.contentScreening.alwaysFirst,
      overrides.contentScreening?.alwaysFirst,
    ],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy</CardTitle>
        <CardDescription>
          Overrides for this organization only. Leave a field empty to use the default (shown in
          grey). Saving re-evaluates the organization on the worker's next run.
        </CardDescription>
      </CardHeader>
      <CardPanel>
        <form action={formAction} className="flex flex-col gap-4">
          <input name="organizationId" type="hidden" value={props.organizationId} />
          <div className="grid gap-4 sm:grid-cols-2">
            {rateFields.map(([name, label, fallback, value]) => (
              <Field key={name}>
                <FieldLabel>{label}</FieldLabel>
                <Input
                  defaultValue={value === undefined ? "" : percent(value)}
                  inputMode="decimal"
                  name={name}
                  placeholder={percent(fallback)}
                />
              </Field>
            ))}
            {countFields.map(([name, label, fallback, value]) => (
              <Field key={name}>
                <FieldLabel>{label}</FieldLabel>
                <Input
                  defaultValue={value === undefined ? "" : String(value)}
                  inputMode="numeric"
                  name={name}
                  placeholder={String(fallback)}
                />
              </Field>
            ))}
          </div>
          <Label>
            <Checkbox
              defaultChecked={overrides.countSimulatorRecipients ?? false}
              name="countSimulatorRecipients"
            />
            Count mailbox-simulator recipients (testing only)
          </Label>
          <Label>
            <Checkbox
              defaultChecked={overrides.contentScreening?.enforce === false}
              name="screeningShadow"
            />
            Content screening in shadow mode (record verdicts, never block, warn or suspend)
          </Label>
          <Label>
            <Checkbox
              defaultChecked={overrides.contentScreening?.enabled === false}
              name="screeningDisabled"
            />
            Disable content screening (e.g. phishing-simulation senders)
          </Label>
          <Field>
            <FieldLabel>Note</FieldLabel>
            <Input maxLength={2000} name="note" placeholder="Optional" />
          </Field>
          {state && !state.ok ? <FormError message={state.error} /> : null}
          <div className="flex gap-2">
            <Button loading={pending} name="intent" type="submit" value="save">
              Save policy
            </Button>
            <Button name="intent" type="submit" value="reset" variant="ghost">
              Reset to defaults
            </Button>
          </div>
        </form>
      </CardPanel>
    </Card>
  );
}
