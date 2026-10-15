"use client";

import { Alert, AlertDescription } from "@coss/ui/components/alert";
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
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { useActionState, useEffect, useState } from "react";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import {
  addPaymentMethodAction,
  cancelScheduledChangeAction,
  downgradePlanAction,
  managePaymentMethodsAction,
  updateSpendControlsAction,
  upgradePlanAction,
} from "./actions";

/** Upgrades now (prorated); reports a payment that needs confirming or failed. */
export function UpgradeButton(props: { orgSlug: string; plan: string; label: string }) {
  const [state, formAction, pending] = useActionToast(upgradePlanAction, {
    // A payment that needs confirming or is still processing is explained inline below.
    success: (outcome) => (outcome.status === "active" ? "Plan upgraded" : null),
  });
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="plan" type="hidden" value={props.plan} />
      <Button loading={pending} size="sm" type="submit">
        {props.label}
      </Button>
      {state?.ok && state.data.status === "requires_action" ? (
        <Alert variant="warning">
          <AlertDescription>
            Your bank needs you to confirm the payment.{" "}
            {state.data.url ? (
              <a className="underline" href={state.data.url} rel="noreferrer" target="_blank">
                Confirm it
              </a>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {state?.ok && state.data.status === "processing" ? (
        <p className="text-muted-foreground text-xs">
          The payment is processing; the plan changes once it clears.
        </p>
      ) : null}
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

/** Downgrades (or cancels) at the end of the billing period, after confirming. */
export function DowngradeButton(props: {
  orgSlug: string;
  plan: string;
  label: string;
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
        {props.label}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* The popup unmounts when closed, which also resets the form state. */}
        <DowngradeForm {...props} onDone={() => setOpen(false)} />
      </AlertDialogPopup>
    </AlertDialog>
  );
}

function DowngradeForm(props: {
  orgSlug: string;
  plan: string;
  label: string;
  title: string;
  description: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionToast(downgradePlanAction, {
    success: {
      title: props.plan === "free" ? "Cancellation scheduled" : "Plan change scheduled",
      description: "You can undo it until the end of the billing period.",
    },
  });
  const { onDone } = props;

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    // `contents` keeps header/footer as direct flex children of the popup (coss ui pattern).
    <form action={formAction} className="contents">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="plan" type="hidden" value={props.plan} />
      <AlertDialogHeader>
        <AlertDialogTitle>{props.title}</AlertDialogTitle>
        <AlertDialogDescription>{props.description}</AlertDialogDescription>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogClose render={<Button variant="ghost" />}>Close</AlertDialogClose>
        <Button loading={pending} type="submit" variant="destructive">
          {props.label}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

export function CancelScheduledChangeButton(props: { orgSlug: string; label: string }) {
  const [state, formAction, pending] = useActionToast(cancelScheduledChangeAction, {
    success: "Scheduled plan change undone",
  });
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <div>
        <Button loading={pending} size="sm" type="submit" variant="outline">
          {props.label}
        </Button>
      </div>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

/** Adds a payment method (the provider's page) and, with a portal, manages them. */
export function PaymentMethodButtons(props: {
  orgSlug: string;
  hasMethod: boolean;
  portal: boolean;
}) {
  const [addState, addAction, adding] = useActionState(addPaymentMethodAction, null);
  const [manageState, manageAction, managing] = useActionState(managePaymentMethodsAction, null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={addAction}>
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <Button
            loading={adding}
            size="sm"
            type="submit"
            variant={props.hasMethod ? "outline" : "default"}
          >
            {props.hasMethod ? "Replace payment method" : "Add a payment method"}
          </Button>
        </form>
        {props.portal && props.hasMethod ? (
          <form action={manageAction}>
            <input name="orgSlug" type="hidden" value={props.orgSlug} />
            <Button loading={managing} size="sm" type="submit" variant="outline">
              Manage billing details
            </Button>
          </form>
        ) : null}
      </div>
      {addState && !addState.ok ? <FormError message={addState.error} /> : null}
      {manageState && !manageState.ok ? <FormError message={manageState.error} /> : null}
    </div>
  );
}

export function SpendControlsForm(props: {
  orgSlug: string;
  spendLimit: string;
  alertThresholds: string;
  billingEmail: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionToast(updateSpendControlsAction, {
    success: "Spend controls saved",
  });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <Field>
        <FieldLabel>Spend limit (USD per month)</FieldLabel>
        <Input
          defaultValue={props.spendLimit}
          disabled={props.disabled}
          inputMode="decimal"
          name="spendLimit"
          placeholder="No limit"
        />
        <FieldDescription>
          Usage beyond your plan's credit that goes past this pauses live sending until the next
          month or until you raise it. Leave empty for no limit.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Usage alerts (% of your monthly credit or allowance)</FieldLabel>
        <Input
          defaultValue={props.alertThresholds}
          disabled={props.disabled}
          name="alertThresholds"
          placeholder="80, 100"
        />
      </Field>
      <Field>
        <FieldLabel>Billing email</FieldLabel>
        <Input
          defaultValue={props.billingEmail}
          disabled={props.disabled}
          name="billingEmail"
          placeholder="Owners and admins"
          type="email"
        />
        <FieldDescription>Invoices, payment reminders and usage alerts go here.</FieldDescription>
      </Field>
      <FormError message={state?.ok ? null : state?.error} />
      {props.disabled ? null : (
        <div>
          <Button loading={pending} type="submit">
            Save
          </Button>
        </div>
      )}
    </form>
  );
}
