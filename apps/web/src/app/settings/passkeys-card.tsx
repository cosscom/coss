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
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { FingerprintIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { Panel, PanelBody } from "@/components/panel";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export type PasskeyRow = {
  id: string;
  name: string;
  /** Synced across devices (e.g. iCloud Keychain, Google Password Manager) or single-device. */
  synced: boolean;
  createdAt: string;
};

const NAME_MAX_LENGTH = 64;

export function PasskeysCard(props: { passkeys: PasskeyRow[]; restriction: string | null }) {
  return (
    <Panel
      action={props.restriction ? null : <AddPasskeyDialog />}
      description="Sign in with your fingerprint, face or device PIN instead of a password. A passkey sign-in doesn't ask for an authenticator code."
      title="Passkeys"
    >
      {props.restriction ? (
        <PanelBody>
          <Alert variant="warning">
            <AlertDescription>{props.restriction}</AlertDescription>
          </Alert>
        </PanelBody>
      ) : null}
      {props.passkeys.length === 0 ? (
        <PanelBody flush>
          <EmptyState
            compact
            description="Add one to sign in without typing your password."
            icon={FingerprintIcon}
            title="No passkeys yet"
          />
        </PanelBody>
      ) : (
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Added</TableHead>
              {props.restriction ? null : <TableHead className="w-0" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.passkeys.map((passkey) => (
              <TableRow key={passkey.id}>
                <TableCell className="font-medium">{passkey.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{passkey.synced ? "synced" : "this device"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{passkey.createdAt}</TableCell>
                {props.restriction ? null : (
                  <TableCell className="text-right">
                    <DeletePasskeyButton id={passkey.id} name={passkey.name} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function AddPasskeyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>Add passkey</DialogTrigger>
      <DialogPopup>
        <AddPasskeyForm
          onAdded={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogPopup>
    </Dialog>
  );
}

function AddPasskeyForm({ onAdded }: { onAdded: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    setPending(true);
    setError(null);
    const result = await authClient.passkey.addPasskey({ name: name || undefined });
    if (result?.error) {
      setError(authErrorMessage(result.error, "Could not add the passkey."));
      setPending(false);
      return;
    }
    onAdded();
  }

  return (
    <form className="contents" onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>Add a passkey</DialogTitle>
        <DialogDescription>
          Your browser will ask you to create a passkey with your device or password manager.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            autoFocus
            maxLength={NAME_MAX_LENGTH}
            name="name"
            placeholder="e.g. MacBook Touch ID"
          />
          <FieldDescription>Helps you tell your passkeys apart. Optional.</FieldDescription>
        </Field>
        <FormError message={error} />
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button loading={pending} type="submit">
          Continue
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeletePasskeyButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError(null);
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) {
      setError(authErrorMessage(error, "Could not remove the passkey."));
      setPending(false);
      return;
    }
    // On success the page re-renders without this passkey, which unmounts the dialog.
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="xs" variant="destructive-outline" />}>
        Remove
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            You won't be able to sign in with it anymore. Also delete it from your device or
            password manager.
          </AlertDialogDescription>
          <FormError message={error} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <Button loading={pending} onClick={remove} variant="destructive">
            Remove passkey
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
