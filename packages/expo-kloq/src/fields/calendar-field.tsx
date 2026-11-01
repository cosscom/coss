import { Host, Picker, Text } from "@expo/ui";
import {
  type CalendarAccount,
  type CalendarSource,
  findCalendar,
  groupByAccount,
  useCalendarSources,
} from "../shared.ts";

export function calendarChoices(
  accounts: readonly CalendarAccount[],
  sources: readonly CalendarSource[],
  current?: string,
) {
  const offerable = sources.filter((source) => !source.readOnly || source.id === current);
  return groupByAccount(accounts, offerable).filter((group) => group.calendars.length > 0);
}

export function calendarSummary(calendar: CalendarSource | undefined): string {
  return calendar?.name ?? "No calendar";
}

export interface CalendarFieldProps {
  value?: string;
  onChange: (calendar: CalendarSource) => void;
  readOnly?: boolean;
  accounts?: readonly CalendarAccount[];
  sources?: readonly CalendarSource[];
}

/** Which calendar an event lives on. A native menu picker. */
export function CalendarField({
  value,
  onChange,
  readOnly = false,
  accounts,
  sources,
}: CalendarFieldProps) {
  const registry = useCalendarSources();
  const resolvedAccounts = accounts ?? registry.accounts;
  const resolvedSources = sources ?? registry.sources;
  const groups = calendarChoices(resolvedAccounts, resolvedSources, value);
  if (groups.length === 0) return null;
  const current = findCalendar(resolvedSources, value);
  const summary = calendarSummary(current);
  if (readOnly) {
    return (
      <Host matchContents>
        <Text>{summary}</Text>
      </Host>
    );
  }
  const selected = current?.id ?? groups[0]?.calendars[0]?.id ?? "";
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Picker
        selectedValue={selected}
        onValueChange={(next) => {
          const calendar = findCalendar(resolvedSources, String(next));
          if (calendar) onChange(calendar);
        }}
      >
        {groups.flatMap((group) =>
          group.calendars.map((calendar) => (
            <Picker.Item
              key={calendar.id}
              label={`${group.account.label} · ${calendar.name}`}
              value={calendar.id}
            />
          )),
        )}
      </Picker>
    </Host>
  );
}
