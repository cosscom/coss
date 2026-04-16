"use client";

import { Button } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { SelectButton } from "@coss/ui/components/select";
import { SearchIcon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { DelegationCredentialItem } from "./delegation-credential-types";
import {
  findWorkspacePlatformItem,
  WORKSPACE_PLATFORM_ITEMS,
  type WorkspacePlatformItem,
} from "./delegation-credential-workspace-platforms";

export type EditDelegationCredentialSavePayload = {
  domain: string;
  platformLabel: string;
  platformValue: string;
};

interface EditDelegationCredentialDialogProps {
  credential: DelegationCredentialItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: EditDelegationCredentialSavePayload) => void;
  open: boolean;
}

export function EditDelegationCredentialDialog({
  credential,
  onOpenChange,
  onSave,
  open,
}: EditDelegationCredentialDialogProps) {
  const [platform, setPlatform] = useState<WorkspacePlatformItem | null>(null);

  useEffect(() => {
    if (open && credential) {
      setPlatform(
        findWorkspacePlatformItem(credential.platformValue) ?? {
          label: credential.platformLabel,
          value: credential.platformValue,
        },
      );
    }
  }, [open, credential]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!credential) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const domain = (formData.get("domain") as string) || "";
    onSave(credential.id, {
      domain: domain.trim() || "Untitled domain",
      platformLabel: platform?.label ?? "—",
      platformValue: platform?.value ?? "",
    });
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open && !!credential}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        {credential ? (
          <Form
            className="contents"
            key={credential.id}
            onSubmit={handleSubmit}
          >
            <DialogHeader>
              <DialogTitle>Edit delegation credential</DialogTitle>
            </DialogHeader>
            <DialogPanel className="grid gap-4">
              <Field>
                <FieldLabel>Domain</FieldLabel>
                <Input
                  defaultValue={credential.domain}
                  key={`${credential.id}-domain`}
                  name="domain"
                  type="text"
                />
              </Field>
              <Field>
                <FieldLabel>Workspace platform</FieldLabel>
                <Combobox
                  aria-label="Workspace platform"
                  items={WORKSPACE_PLATFORM_ITEMS}
                  onValueChange={(item) => setPlatform(item)}
                  value={platform}
                >
                  <ComboboxTrigger
                    render={<SelectButton className="w-full min-w-0" />}
                  >
                    <ComboboxValue placeholder="Select..." />
                  </ComboboxTrigger>
                  <ComboboxPopup aria-label="Workspace platform">
                    <div className="border-b p-2">
                      <ComboboxInput
                        className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                        placeholder="Search…"
                        showTrigger={false}
                        startAddon={<SearchIcon />}
                      />
                    </div>
                    <ComboboxEmpty>No platforms found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: WorkspacePlatformItem) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </Form>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
