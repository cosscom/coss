"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { useState } from "react";

import { Disable2FADialog } from "./disable-2fa-dialog";
import { Enable2FADialog } from "./enable-2fa-dialog";

export function TwoFactorAuthSection() {
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  return (
    <Field className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <FieldLabel className="self-center">
            Two factor authentication
          </FieldLabel>
          <Badge variant={enabled ? "success" : "warning"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          Add an extra layer of security to your account in case your password
          is stolen.
        </p>
      </div>
      <div className="self-center">
        {enabled ? (
          <Button onClick={() => setDisableDialogOpen(true)} variant="outline">
            Disable
          </Button>
        ) : (
          <Button onClick={() => setEnableDialogOpen(true)}>Enable</Button>
        )}
      </div>

      <Enable2FADialog
        onEnabled={() => setEnabled(true)}
        onOpenChange={setEnableDialogOpen}
        open={enableDialogOpen}
      />

      <Disable2FADialog
        onDisabled={() => setEnabled(false)}
        onOpenChange={setDisableDialogOpen}
        open={disableDialogOpen}
      />
    </Field>
  );
}
