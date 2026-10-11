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
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { useActionState, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { FormError } from "@/components/form-error";
import {
  connectScimAction,
  createScimTokenAction,
  disconnectScimAction,
  revokeScimTokenAction,
  saveScimGroupRolesAction,
} from "./actions";

const LIFETIME_ITEMS = [
  { label: "90 days", value: "90" },
  { label: "1 year", value: "365" },
  { label: "2 years", value: "730" },
];

const ROLE_ITEMS = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
];

function LifetimeSelect() {
  return (
    <Field>
      <FieldLabel>Token expires after</FieldLabel>
      <Select defaultValue="365" items={LIFETIME_ITEMS} name="lifetimeDays">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {LIFETIME_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

/** A token shown once, right after it was issued. */
function NewToken({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="font-medium text-sm">
        Copy this token into your identity provider now. For security it won't be shown again.
      </p>
      <code className="block select-all break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
        {token}
      </code>
      <div>
        <CopyButton label="Copy token" value={token} />
      </div>
    </div>
  );
}

/**
 * Connect / disconnect. One component for both states: connecting re-renders the page as
 * connected, and the first token (kept in this component's action state) must stay on screen.
 */
export function ScimConnectionControls(props: {
  orgSlug: string;
  status: "none" | "active" | "decommissioning";
  canConnect: boolean;
}) {
  const [state, formAction, pending] = useActionState(connectScimAction, null);
  if (props.status !== "none") {
    return (
      <div className="flex flex-col gap-4">
        {state?.ok ? <NewToken token={state.data.token} /> : null}
        <div>
          <DisconnectScimButton
            orgSlug={props.orgSlug}
            resume={props.status === "decommissioning"}
          />
        </div>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <LifetimeSelect />
      <Button disabled={!props.canConnect} loading={pending} type="submit">
        Connect directory
      </Button>
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function CreateScimTokenForm(props: { orgSlug: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(createScimTokenAction, null);
  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input name="orgSlug" type="hidden" value={props.orgSlug} />
        <LifetimeSelect />
        <Button disabled={props.disabled} loading={pending} type="submit" variant="outline">
          New token
        </Button>
      </form>
      {state?.ok ? <NewToken token={state.data.token} /> : null}
      {state && !state.ok ? <FormError message={state.error} /> : null}
    </div>
  );
}

export function RevokeScimTokenButton(props: { orgSlug: string; credentialId: string }) {
  const [state, formAction, pending] = useActionState(revokeScimTokenAction, null);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Revoke
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <form action={formAction} className="contents">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <input name="credentialId" type="hidden" value={props.credentialId} />
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this token?</AlertDialogTitle>
            <AlertDialogDescription>
              Your identity provider stops syncing until it uses another token.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Revoke token
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

function DisconnectScimButton(props: { orgSlug: string; resume: boolean }) {
  const [state, formAction, pending] = useActionState(disconnectScimAction, null);
  if (props.resume) {
    return (
      <form action={formAction} className="flex flex-col gap-2">
        <input name="orgSlug" type="hidden" value={props.orgSlug} />
        <div>
          <Button loading={pending} size="sm" type="submit" variant="outline">
            Continue disconnecting
          </Button>
        </div>
        {state && !state.ok ? <FormError message={state.error} /> : null}
      </form>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" />}>
        Disconnect directory
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <form action={formAction} className="contents">
          <input name="orgSlug" type="hidden" value={props.orgSlug} />
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect the directory?</AlertDialogTitle>
            <AlertDialogDescription>
              Every token stops working at once. Members the directory added stay, as ordinary
              members you manage here, and anyone on your SSO domains can sign in with SSO again.
            </AlertDialogDescription>
            {state && !state.ok ? <FormError message={state.error} /> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button loading={pending} type="submit" variant="destructive">
              Disconnect
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

type MappingRow = { key: number; groupName: string; role: "admin" | "member" };

/** Directory group → role mappings, edited as a list and saved together. */
export function ScimGroupRolesForm(props: {
  orgSlug: string;
  mappings: { groupName: string; role: "admin" | "member" }[];
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveScimGroupRolesAction, null);
  const [rows, setRows] = useState<MappingRow[]>(() =>
    props.mappings.map((mapping, index) => ({ key: index, ...mapping })),
  );
  const [nextKey, setNextKey] = useState(props.mappings.length);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No mappings: everyone the directory provisions is a member.
        </p>
      ) : (
        rows.map((row) => (
          <div className="flex flex-wrap items-end gap-3" key={row.key}>
            <Field className="min-w-56 flex-1">
              <FieldLabel>Group name</FieldLabel>
              <Input
                value={row.groupName}
                onChange={(event) => {
                  const groupName = event.target.value;
                  setRows((current) =>
                    current.map((r) => (r.key === row.key ? { ...r, groupName } : r)),
                  );
                }}
                disabled={props.disabled}
                name="groupName"
                placeholder="e.g. COSS Admins"
                required
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={row.role}
                onValueChange={(role) => {
                  if (role !== "admin" && role !== "member") return;
                  setRows((current) =>
                    current.map((r) => (r.key === row.key ? { ...r, role } : r)),
                  );
                }}
                disabled={props.disabled}
                items={ROLE_ITEMS}
                name="role"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {ROLE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
            <Button
              disabled={props.disabled}
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              type="button"
              variant="ghost"
            >
              Remove
            </Button>
          </div>
        ))
      )}
      {state && !state.ok ? <FormError message={state.error} /> : null}
      {state?.ok ? <p className="text-muted-foreground text-sm">Saved and applied.</p> : null}
      <div className="flex gap-2">
        <Button
          disabled={props.disabled}
          onClick={() => {
            setRows((current) => [...current, { key: nextKey, groupName: "", role: "admin" }]);
            setNextKey((key) => key + 1);
          }}
          type="button"
          variant="outline"
        >
          Add group
        </Button>
        <Button disabled={props.disabled} loading={pending} type="submit">
          Save mappings
        </Button>
      </div>
    </form>
  );
}
