"use client";

import { UserPlusIcon } from "lucide-react";
import { Button } from "@/registry/default/ui/button";
import { Field, FieldLabel } from "@/registry/default/ui/field";
import { Form } from "@/registry/default/ui/form";
import { Input } from "@/registry/default/ui/input";
import { Textarea } from "@/registry/default/ui/textarea";
import type { BookerLabels } from "./booker-labels";
import {
  formatConfirmDateDetail,
  formatConfirmTimeRange,
  formatSelectedWeekday,
} from "@/lib/booker/utils";

type BookerConfirmFormProps = {
  defaultEmail?: string;
  defaultName?: string;
  durationMinutes: number;
  is24Hour: boolean;
  labels: BookerLabels;
  locale: string;
  onBack: () => void;
  selectedDate?: Date;
  selectedTime: string | null;
};

function RequiredMark() {
  return <span className="text-destructive-foreground">*</span>;
}

export function BookerConfirmForm({
  defaultEmail,
  defaultName,
  durationMinutes,
  is24Hour,
  labels,
  locale,
  onBack,
  selectedDate,
  selectedTime,
}: BookerConfirmFormProps) {
  const showSummary = selectedDate != null && selectedTime != null;

  return (
    <div className="flex flex-col gap-4">
      {showSummary ? (
        <div className="flex flex-wrap items-baseline gap-x-1.5 font-heading">
          <span>
            {formatSelectedWeekday(selectedDate, locale)}{" "}
            {formatConfirmDateDetail(selectedDate, locale)}
          </span>
          <span className="text-muted-foreground/72">
            {formatConfirmTimeRange(
              selectedTime,
              durationMinutes,
              !is24Hour,
              locale,
            )}
          </span>
        </div>
      ) : null}

      <Form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Field>
          <FieldLabel>
            {labels.confirmYourName} <RequiredMark />
          </FieldLabel>
          <Input
            autoFocus
            defaultValue={defaultName}
            name="name"
            required
            type="text"
          />
        </Field>

        <Field>
          <FieldLabel>
            {labels.confirmEmail} <RequiredMark />
          </FieldLabel>
          <Input
            autoComplete="email"
            defaultValue={defaultEmail}
            name="email"
            required
            type="email"
          />
        </Field>

        <Field>
          <FieldLabel>{labels.confirmNotes}</FieldLabel>
          <Textarea
            name="notes"
            placeholder={labels.confirmNotesPlaceholder}
            rows={3}
          />
        </Field>

        <Button className="self-start" type="button" variant="ghost">
          <UserPlusIcon aria-hidden="true" />
          {labels.confirmAddGuests}
        </Button>

        <p className="text-muted-foreground text-sm">
          {labels.confirmTermsPrefix}{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href="https://cal.com/terms"
            rel="noreferrer"
            target="_blank"
          >
            {labels.confirmTerms}
          </a>{" "}
          and{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href="https://cal.com/privacy"
            rel="noreferrer"
            target="_blank"
          >
            {labels.confirmPrivacyPolicy}
          </a>
          .
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onBack} type="button" variant="ghost">
            {labels.confirmBack}
          </Button>
          <Button type="submit">{labels.confirmSubmit}</Button>
        </div>
      </Form>
    </div>
  );
}
