"use client";

import { Button } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { SelectButton } from "@coss/ui/components/select";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

interface DirectoryProviderItem {
  label: string;
  value: string;
}

const DIRECTORY_PROVIDER_ITEMS: DirectoryProviderItem[] = [
  { label: "Azure SCIM v2.0", value: "azure-scim-v2" },
  { label: "Okta SCIM v2.0", value: "okta-scim-v2" },
  { label: "JumpCloud v2.0", value: "jumpcloud-v2" },
  { label: "OneLogin SCIM v2.0", value: "onelogin-scim-v2" },
  { label: "SCIM Generic v2.0", value: "scim-generic-v2" },
];

const firstDirectoryProvider = DIRECTORY_PROVIDER_ITEMS[0];
if (!firstDirectoryProvider) {
  throw new Error("DIRECTORY_PROVIDER_ITEMS must not be empty.");
}
const initialDirectoryProvider: DirectoryProviderItem = firstDirectoryProvider;

export interface ConfigureDirectorySyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigured?: () => void;
}

export function ConfigureDirectorySyncDialog({
  open,
  onOpenChange,
  onConfigured,
}: ConfigureDirectorySyncDialogProps) {
  const [directoryName, setDirectoryName] = useState("");
  const [provider, setProvider] = useState<DirectoryProviderItem>(
    initialDirectoryProvider,
  );
  const [errors, setErrors] = useState<{
    directoryName?: string;
    directoryProvider?: string;
  }>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setDirectoryName("");
    setProvider(initialDirectoryProvider);
    setErrors({});
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = directoryName.trim();
    const next: { directoryName?: string; directoryProvider?: string } = {};
    if (!trimmedName) {
      next.directoryName = "Directory name is required.";
    }
    if (!provider?.value) {
      next.directoryProvider = "Directory provider is required.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    onConfigured?.();
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        <Form className="contents" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configure directory sync</DialogTitle>
            <DialogDescription>
              Choose an identity provider to configure directory for your team.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              <Field invalid={Boolean(errors.directoryName)}>
                <FieldLabel>Directory name</FieldLabel>
                <Input
                  aria-invalid={errors.directoryName ? true : undefined}
                  onChange={(e) => setDirectoryName(e.target.value)}
                  type="text"
                  value={directoryName}
                />
                {errors.directoryName ? (
                  <FieldError match>{errors.directoryName}</FieldError>
                ) : null}
              </Field>
              <Field invalid={Boolean(errors.directoryProvider)}>
                <FieldLabel>Directory provider</FieldLabel>
                <Combobox
                  isItemEqualToValue={(item, value) =>
                    item != null && value != null && item.value === value.value
                  }
                  items={DIRECTORY_PROVIDER_ITEMS}
                  onValueChange={(item) => {
                    if (item) {
                      setProvider(item);
                    }
                  }}
                  value={provider}
                >
                  <ComboboxTrigger render={<SelectButton className="w-full" />}>
                    <ComboboxValue />
                  </ComboboxTrigger>
                  <ComboboxPopup aria-label="Directory providers">
                    <ComboboxEmpty>No providers found.</ComboboxEmpty>
                    <ComboboxList>
                      <ComboboxGroup items={DIRECTORY_PROVIDER_ITEMS}>
                        <ComboboxGroupLabel className="sr-only">
                          Directory provider options
                        </ComboboxGroupLabel>
                        <ComboboxCollection>
                          {(item: DirectoryProviderItem) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxGroup>
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
                {errors.directoryProvider ? (
                  <FieldError match>{errors.directoryProvider}</FieldError>
                ) : null}
              </Field>
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
