"use client";

import type { AvailableNumber } from "@coss/sms/twilio";
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
import { useActionState, useEffect, useState } from "react";
import { FormError } from "@/components/form-error";
import { useActionToast } from "@/lib/toast";
import {
  buyNumberAction,
  releaseNumberAction,
  searchNumbersAction,
  setCountriesAction,
  setReceivingEnvironmentAction,
} from "./actions";

export type EnvironmentOption = { id: string; label: string };

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BuyNumberDialog(props: { orgSlug: string; environments: EnvironmentOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>Buy a number</DialogTrigger>
      <DialogPopup className="sm:max-w-lg">
        <BuyNumber {...props} onDone={() => setOpen(false)} />
      </DialogPopup>
    </Dialog>
  );
}

function BuyNumber(props: {
  orgSlug: string;
  environments: EnvironmentOption[];
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"local" | "toll_free">("local");
  const [search, searchAction, searching] = useActionState(searchNumbersAction, null);
  const [state, buyAction, buying] = useActionToast(buyNumberAction, { success: "Number bought" });
  const [chosen, setChosen] = useState<string | null>(null);
  const { onDone } = props;
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const results: AvailableNumber[] = search?.ok ? search.data : [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Buy a number</DialogTitle>
        <DialogDescription>
          Local numbers send in the US under your A2P 10DLC registration; toll-free numbers need
          their own verification and only reach the US and Canada. Numbers are billed monthly at
          cost.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <form action={searchAction} className="flex flex-wrap items-end gap-2">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <Field className="w-36">
            <FieldLabel>Type</FieldLabel>
            <select
              className={SELECT_CLASS}
              name="kind"
              onChange={(event) => setKind(event.target.value as "local" | "toll_free")}
              value={kind}
            >
              <option value="local">Local</option>
              <option value="toll_free">Toll-free</option>
            </select>
          </Field>
          <Field className="w-24">
            <FieldLabel>Country</FieldLabel>
            <select className={SELECT_CLASS} name="country">
              <option value="US">US</option>
              <option value="CA">CA</option>
            </select>
          </Field>
          {kind === "local" ? (
            <Field className="w-28">
              <FieldLabel>Area code</FieldLabel>
              <Input inputMode="numeric" maxLength={3} name="areaCode" placeholder="415" />
            </Field>
          ) : null}
          <Button loading={searching} type="submit" variant="outline">
            Search
          </Button>
        </form>
        {search && !search.ok ? <FormError message={search.error} /> : null}
        {search?.ok && results.length === 0 ? (
          <p className="text-muted-foreground text-sm">No numbers found. Try another area code.</p>
        ) : null}
        {results.length > 0 ? (
          <form action={buyAction} className="flex flex-col gap-4">
            <input name="orgSlug" type="hidden" value={props.orgSlug} />
            <input name="kind" type="hidden" value={kind} />
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 font-medium text-sm">Choose a number</legend>
              {results.map((number) => (
                <label className="flex items-center gap-2 text-sm" key={number.phoneNumber}>
                  <input
                    checked={chosen === number.phoneNumber}
                    name="phoneNumber"
                    onChange={() => setChosen(number.phoneNumber)}
                    type="radio"
                    value={number.phoneNumber}
                  />
                  <span className="font-mono">{number.phoneNumber}</span>
                  {number.locality ? (
                    <span className="text-muted-foreground">
                      {number.locality}, {number.region}
                    </span>
                  ) : null}
                </label>
              ))}
            </fieldset>
            <Field>
              <FieldLabel>Replies go to</FieldLabel>
              <select className={SELECT_CLASS} name="receivingEnvironmentId">
                <option value="">No environment (replies are dropped)</option>
                {props.environments.map((environment) => (
                  <option key={environment.id} value={environment.id}>
                    {environment.label}
                  </option>
                ))}
              </select>
              <FieldDescription>STOP and START are honored either way.</FieldDescription>
            </Field>
            {state && !state.ok ? <FormError message={state.error} /> : null}
            <DialogFooter className="px-0 pb-0">
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button disabled={!chosen} loading={buying} type="submit">
                Buy number
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogPanel>
    </>
  );
}

export function ReceivingEnvironmentForm(props: {
  orgSlug: string;
  numberId: string;
  phoneNumber: string;
  value: string | null;
  environments: EnvironmentOption[];
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionToast(setReceivingEnvironmentAction, {
    success: "Replies setting saved",
    errors: "toast",
  });
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="numberId" type="hidden" value={props.numberId} />
      <input name="phoneNumber" type="hidden" value={props.phoneNumber} />
      <select
        aria-label="Replies go to"
        className={`${SELECT_CLASS} h-8 max-w-56`}
        defaultValue={props.value ?? ""}
        disabled={props.disabled || pending}
        name="environmentId"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">Dropped</option>
        {props.environments.map((environment) => (
          <option key={environment.id} value={environment.id}>
            {environment.label}
          </option>
        ))}
      </select>
      {state && !state.ok ? <span className="sr-only">{state.error}</span> : null}
    </form>
  );
}

export function ReleaseNumberButton(props: {
  orgSlug: string;
  numberId: string;
  phoneNumber: string;
}) {
  const [state, formAction, pending] = useActionToast(releaseNumberAction, {
    success: `${props.phoneNumber} released`,
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="xs" variant="destructive-outline" />}>
        Release
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <form action={formAction} className="contents">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <input name="numberId" type="hidden" value={props.numberId} />
          <input name="phoneNumber" type="hidden" value={props.phoneNumber} />
          <AlertDialogHeader>
            <AlertDialogTitle>Release {props.phoneNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Messages can no longer be sent from it, and it goes back to the carrier: you may not
              be able to get it again. Its current month isn't refunded.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Release number
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

export function CountriesForm(props: {
  orgSlug: string;
  countries: { code: string; name: string; price: string; locked: boolean }[];
  allowed: string[];
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionToast(setCountriesAction, {
    success: "Countries saved",
  });
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <Input
        className="max-w-xs"
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter countries"
        type="search"
        value={filter}
      />
      <div className="grid max-h-80 gap-x-6 gap-y-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {props.countries.map((country) => (
          <Label
            className={`flex items-center gap-2 text-sm ${
              needle && !country.name.toLowerCase().includes(needle) ? "hidden" : ""
            }`}
            key={country.code}
          >
            <Checkbox
              defaultChecked={props.allowed.includes(country.code)}
              disabled={props.disabled || country.locked}
              name="country"
              value={country.code}
            />
            <span>{country.name}</span>
            <span className="text-muted-foreground tabular-nums">{country.price}</span>
            {country.locked ? (
              <span className="text-muted-foreground text-xs">(contact support)</span>
            ) : null}
          </Label>
        ))}
      </div>
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <div>
        <Button disabled={props.disabled} loading={pending} size="sm" type="submit">
          Save countries
        </Button>
      </div>
    </form>
  );
}
