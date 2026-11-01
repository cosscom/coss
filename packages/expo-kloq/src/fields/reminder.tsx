import { Button, Column, Host, List, ListItem, Picker, Text } from "@expo/ui";
import {
  describeReminders,
  MAX_REMINDERS,
  normalizeReminders,
  REMINDER_PRESETS,
  type Reminder,
  removeReminder,
} from "../shared.ts";

export interface ReminderFieldProps {
  value?: readonly Reminder[];
  onChange: (next: Reminder[]) => void;
  readOnly?: boolean;
}

/** Reminder offsets. Adding one uses a native picker of kloq's presets. */
export function ReminderField({ value, onChange, readOnly = false }: ReminderFieldProps) {
  const reminders = normalizeReminders(value);
  const summary = describeReminders(reminders);
  if (readOnly) {
    return (
      <Host matchContents>
        <Text>{summary}</Text>
      </Host>
    );
  }
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column spacing={8}>
        <Text textStyle={{ fontSize: 13 }}>{summary}</Text>
        {reminders.length > 0 ? (
          <List>
            {(() => {
              const seen = new Map<string, number>();
              return reminders.map((reminder) => {
                const base = `${reminder.minutesBefore}:${reminder.method ?? "popup"}`;
                const n = (seen.get(base) ?? 0) + 1;
                seen.set(base, n);
                return (
                  <ListItem
                    key={`${base}:${n}`}
                    trailing={
                      <Button
                        variant="text"
                        label="Remove"
                        onPress={() => onChange(removeReminder(reminders, reminder))}
                      />
                    }
                  >
                    {labelOf(reminder)}
                  </ListItem>
                );
              });
            })()}
          </List>
        ) : null}
        {reminders.length < MAX_REMINDERS ? (
          <Picker
            selectedValue={-1}
            onValueChange={(next) => {
              const minutes = Number(next);
              if (minutes < 0) return;
              onChange(normalizeReminders([...reminders, { minutesBefore: minutes }]));
            }}
          >
            <Picker.Item label="Add reminder" value={-1} />
            {REMINDER_PRESETS.map((preset) => (
              <Picker.Item
                key={preset.minutesBefore}
                label={preset.label}
                value={preset.minutesBefore}
              />
            ))}
          </Picker>
        ) : null}
      </Column>
    </Host>
  );
}

function labelOf(reminder: Reminder): string {
  return (
    REMINDER_PRESETS.find((preset) => preset.minutesBefore === reminder.minutesBefore)?.label ??
    `${reminder.minutesBefore} minutes before`
  );
}
