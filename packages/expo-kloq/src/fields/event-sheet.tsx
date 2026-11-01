import { BottomSheet, Button, Column, Host, RNHostView, Text, TextInput } from "@expo/ui";
import { useState } from "react";
import { ScrollView } from "react-native";
import type { EventDraft } from "../draft.ts";
import { CalendarField } from "../fields/calendar-field.tsx";
import { ReminderField } from "../fields/reminder.tsx";
import { RRuleBuilder } from "../fields/rrule.tsx";
import { NativeDateField } from "../platform/date-field.tsx";
import type { CalendarSource } from "../shared.ts";

export type { EventDraft };

export function EventSheet({
  open,
  draft,
  sources,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  draft: EventDraft | null;
  sources: readonly CalendarSource[];
  onClose: () => void;
  onSubmit: (draft: EventDraft) => void;
  onDelete?: () => void;
}) {
  return (
    <BottomSheet isPresented={open} onDismiss={onClose} snapPoints={["full"]}>
      {draft ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <DraftForm
            key={draft.placementId ?? draft.id ?? "new"}
            draft={draft}
            sources={sources}
            onSubmit={onSubmit}
            onDelete={onDelete}
          />
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function DraftForm({
  draft,
  sources,
  onSubmit,
  onDelete,
}: {
  draft: EventDraft;
  sources: readonly CalendarSource[];
  onSubmit: (draft: EventDraft) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [allDay, setAllDay] = useState(draft.allDay);
  const [calendarId, setCalendarId] = useState(draft.calendarId);
  const [rule, setRule] = useState(draft.rrule);
  const [reminders, setReminders] = useState(draft.reminders);
  const next: EventDraft = {
    ...draft,
    title,
    start,
    end,
    allDay,
    calendarId,
    rrule: rule,
    reminders,
  };
  return (
    <>
      <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
        <Column spacing={8}>
          <Text textStyle={{ fontSize: 18, fontWeight: "700" }}>
            {draft.id ? "Edit event" : "New event"}
          </Text>
          <TextInput defaultValue={draft.title} placeholder="Title" onChangeText={setTitle} />
          <Button
            variant={allDay ? "filled" : "outlined"}
            label={allDay ? "All day" : "Timed"}
            onPress={() => setAllDay((value) => !value)}
          />
        </Column>
      </Host>
      <RNHostView matchContents={{ vertical: true }}>
        <NativeDateField
          title="Starts"
          mode="date"
          value={start}
          onChange={(next) => setStart((prev) => mergeDate(prev, next))}
        />
      </RNHostView>
      {allDay ? null : (
        <RNHostView matchContents={{ vertical: true }}>
          <NativeDateField
            title="Start time"
            mode="time"
            value={start}
            onChange={(next) => setStart((prev) => mergeTime(prev, next))}
          />
        </RNHostView>
      )}
      <RNHostView matchContents={{ vertical: true }}>
        <NativeDateField
          title="Ends"
          mode="date"
          value={end}
          onChange={(next) => setEnd((prev) => mergeDate(prev, next))}
        />
      </RNHostView>
      {allDay ? null : (
        <RNHostView matchContents={{ vertical: true }}>
          <NativeDateField
            title="End time"
            mode="time"
            value={end}
            onChange={(next) => setEnd((prev) => mergeTime(prev, next))}
          />
        </RNHostView>
      )}
      {sources.length > 0 ? (
        <RNHostView matchContents={{ vertical: true }}>
          <CalendarField
            value={calendarId}
            sources={sources}
            onChange={(calendar) => setCalendarId(calendar.id)}
          />
        </RNHostView>
      ) : null}
      <RNHostView matchContents={{ vertical: true }}>
        <RRuleBuilder value={rule} date={start} onChange={setRule} />
      </RNHostView>
      <RNHostView matchContents={{ vertical: true }}>
        <ReminderField value={reminders} onChange={setReminders} />
      </RNHostView>
      <Host matchContents style={{ width: "100%" }}>
        <Column spacing={8}>
          <Button label="Save" onPress={() => onSubmit(next)} />
          {onDelete ? <Button variant="outlined" label="Delete" onPress={onDelete} /> : null}
        </Column>
      </Host>
    </>
  );
}

function mergeDate(prev: Date, next: Date): Date {
  const merged = new Date(prev);
  merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
  return merged;
}

function mergeTime(prev: Date, next: Date): Date {
  const merged = new Date(prev);
  merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
  return merged;
}
