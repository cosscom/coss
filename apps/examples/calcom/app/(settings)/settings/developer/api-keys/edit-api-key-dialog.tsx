"use client";

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
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { useState } from "react";
import { CopyableField } from "../oauth/copyable-field";
import type { ApiKeyItem } from "./api-keys-list";

interface EditApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKeyItem | null;
}

export function EditApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
}: EditApiKeyDialogProps) {
  const [neverExpires, setNeverExpires] = useState(false);

  return (
    <Dialog onOpenChange={onOpenChange} open={open && !!apiKey}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        {apiKey && (
          <Form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit API key</DialogTitle>
              <DialogDescription>
                View and manage your API key settings.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="grid gap-5">
              <CopyableField
                aria-label="API key"
                label="API Key"
                value={apiKey.key}
              />

              <Field>
                <FieldLabel>Personal note</FieldLabel>
                <Input
                  defaultValue={apiKey.note}
                  name="note"
                  placeholder="What is this key for?"
                  type="text"
                />
                <FieldDescription>
                  A personal note to help you identify this key.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Expiration date</FieldLabel>
                <Input
                  defaultValue={
                    apiKey.expiresAt
                      ? new Date(apiKey.expiresAt).toISOString().split("T")[0]
                      : undefined
                  }
                  disabled={neverExpires || apiKey.neverExpires}
                  name="expiresAt"
                  type="date"
                />
                <FieldDescription>
                  The date this key will expire.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>
                  <Checkbox
                    checked={neverExpires || apiKey.neverExpires}
                    onCheckedChange={(checked) =>
                      setNeverExpires(checked === true)
                    }
                  />
                  Never expires
                </FieldLabel>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </Form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
