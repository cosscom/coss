"use client";

import { useRef, useState } from "react";

import { Field, FieldError, FieldLabel } from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";

export default function Particle() {
  const [isInvalid, setIsInvalid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Field invalid={isInvalid} validationMode="onChange">
      <FieldLabel>Email</FieldLabel>
      <Input
        defaultValue="invalid-email"
        onChange={() => {
          if (inputRef.current) {
            setIsInvalid(!inputRef.current.validity.valid);
          }
        }}
        placeholder="Email"
        ref={inputRef}
        type="email"
      />
      <FieldError match="typeMismatch">
        Please enter a valid email address.
      </FieldError>
    </Field>
  );
}
