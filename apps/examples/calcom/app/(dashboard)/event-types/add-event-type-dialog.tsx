"use client";

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
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@coss/ui/components/input-group";
import {
  NumberField,
  NumberFieldInput,
} from "@coss/ui/components/number-field";
import { Toggle } from "@coss/ui/components/toggle";
import { BoldIcon, ItalicIcon } from "lucide-react";

export function AddEventTypeDialog({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className={className} />}>
        {children}
      </DialogTrigger>
      <DialogPopup className="sm:max-w-xl">
        <Form className="contents">
          <DialogHeader>
            <DialogTitle>Add a new event type</DialogTitle>
            <DialogDescription>
              Set up event types to offer different types of meetings.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-5">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input defaultValue="Quick Chat" type="text" />
            </Field>
            <Field>
              <FieldLabel>URL</FieldLabel>
              <Input defaultValue="https://i.cal.com/pasquale/" type="text" />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <InputGroup>
                <InputGroupTextarea
                  defaultValue="A quick video meeting."
                  placeholder="Enter description…"
                />
                <InputGroupAddon
                  align="block-start"
                  className="gap-1 rounded-t-lg border-b bg-muted/72 p-2!"
                >
                  <Toggle aria-label="Toggle bold" size="sm">
                    <BoldIcon />
                  </Toggle>
                  <Toggle aria-label="Toggle italic" size="sm">
                    <ItalicIcon />
                  </Toggle>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel>Duration</FieldLabel>
              <InputGroup>
                <NumberField
                  aria-label="Enter the duration"
                  defaultValue={15}
                  min={1}
                >
                  <NumberFieldInput className="text-left" />
                </NumberField>
                <InputGroupAddon align="inline-end">
                  <InputGroupText>minutes</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Close</DialogClose>
            <Button type="submit">Continue</Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
