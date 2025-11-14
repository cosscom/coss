"use client";

import { Field, FieldLabel, FieldValidity } from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";

export default function FieldWithValidityDemo() {
  return (
    <Field>
      <FieldLabel>Email</FieldLabel>
      <Input type="email" placeholder="Enter your email" required />
      <FieldValidity>
        {(validity) => (
          <div className="flex w-full flex-col gap-2">
            {validity.error && (
              <p className="text-destructive-foreground text-xs">
                {validity.error}
              </p>
            )}
            <div className="w-full rounded-md bg-muted p-2">
              <pre className="no-scrollbar max-h-60 overflow-y-auto font-mono text-xs">
                {JSON.stringify(validity, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </FieldValidity>
    </Field>
  );
}
