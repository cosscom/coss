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
import { Textarea } from "@coss/ui/components/textarea";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  WORKSPACE_PLATFORM_ITEMS,
  type WorkspacePlatformItem,
} from "./delegation-credential-workspace-platforms";

interface AddDelegationCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (data: {
    domain: string;
    platformLabel: string;
    platformValue: string;
    serviceAccountKeyJson: string;
  }) => void;
}

export function AddDelegationCredentialDialog({
  open,
  onOpenChange,
  onCreate,
}: AddDelegationCredentialDialogProps) {
  const [platform, setPlatform] = useState<WorkspacePlatformItem | null>(null);

  useEffect(() => {
    if (open) {
      setPlatform(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const domain = (formData.get("domain") as string) || "";
    const serviceAccountKeyJson =
      (formData.get("serviceAccountKeyJson") as string) || "";
    onCreate?.({
      domain: domain.trim() || "Untitled domain",
      platformLabel: platform?.label ?? "—",
      platformValue: platform?.value ?? "",
      serviceAccountKeyJson,
    });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        <Form className="contents" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add delegation credential</DialogTitle>
          </DialogHeader>
          <DialogPanel className="grid gap-4">
            <Field>
              <FieldLabel>Domain</FieldLabel>
              <Input name="domain" type="text" />
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
            <Field>
              <FieldLabel>Service account key JSON</FieldLabel>
              <Textarea
                className="*:field-sizing-fixed font-mono text-sm *:min-h-0"
                rows={8}
                name="serviceAccountKeyJson"
                placeholder="{...}"
              />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
