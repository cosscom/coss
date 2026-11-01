import { Button, Column, Host, List, ListItem, Switch, Text } from "@expo/ui";
import type { ReactNode } from "react";
import {
  type CalendarAccount,
  type CalendarSource,
  CONFERENCING_PROVIDERS,
  type ConferencingProvider,
  groupByAccount,
  isVisible,
  setCalendarVisible,
  setDefaultCalendar,
  useCalendarSources,
} from "../shared.ts";

export interface CalendarListProps {
  accounts?: CalendarAccount[];
  sources?: CalendarSource[];
  onToggleVisible?: (id: string, visible: boolean) => void;
  onSetDefault?: (id: string) => void;
  allowSetDefault?: boolean;
  accountActions?: boolean;
  conferencing?: readonly ConferencingProvider[];
  onSetAccountConferencing?: (accountId: string, conferencing: string) => void;
  onSetDefaultAccount?: (accountId: string) => void;
  onDisconnectAccount?: (accountId: string) => void;
  heading?: ReactNode;
  empty?: ReactNode;
}

/**
 * Calendars with a native switch for visibility. Account management callbacks
 * are honored; the web conferencing menus are a "Default" button per calendar
 * plus the disconnect callback when `accountActions` is set.
 */
export function CalendarList({
  accounts,
  sources,
  onToggleVisible,
  onSetDefault,
  allowSetDefault = true,
  accountActions = false,
  conferencing: _conferencing = CONFERENCING_PROVIDERS,
  onSetAccountConferencing: _onSetAccountConferencing,
  onSetDefaultAccount,
  onDisconnectAccount,
  heading = "Calendars",
  empty = null,
}: CalendarListProps) {
  const registry = useCalendarSources();
  const resolvedAccounts = accounts ?? registry.accounts;
  const resolvedSources = sources ?? registry.sources;
  const groups = groupByAccount(resolvedAccounts, resolvedSources);
  if (groups.length === 0) {
    if (typeof empty !== "string" || empty.length === 0) return null;
    return (
      <Host matchContents>
        <Text>{empty}</Text>
      </Host>
    );
  }
  const toggle = onToggleVisible ?? setCalendarVisible;
  const makeDefault = onSetDefault ?? setDefaultCalendar;
  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <Column spacing={8}>
        {typeof heading === "string" ? (
          <Text textStyle={{ fontSize: 13, fontWeight: "600" }}>{heading}</Text>
        ) : null}
        <List>
          {groups.flatMap((group) =>
            group.calendars.map((calendar) => (
              <ListItem
                key={calendar.id}
                supportingText={group.account.label}
                trailing={
                  <Switch
                    value={isVisible(calendar)}
                    onValueChange={(visible) => toggle(calendar.id, visible)}
                  />
                }
                onPress={() => {
                  if (allowSetDefault && !calendar.readOnly) makeDefault(calendar.id);
                }}
              >
                {calendar.name}
              </ListItem>
            )),
          )}
        </List>
        {accountActions
          ? groups.map((group) => (
              <Button
                key={group.account.id}
                variant="text"
                label={`Disconnect ${group.account.label}`}
                onPress={() => onDisconnectAccount?.(group.account.id)}
              />
            ))
          : null}
        {accountActions && onSetDefaultAccount
          ? groups.map((group) => (
              <Button
                key={`${group.account.id}-default`}
                variant="outlined"
                label={`Default account: ${group.account.label}`}
                onPress={() => onSetDefaultAccount(group.account.id)}
              />
            ))
          : null}
      </Column>
    </Host>
  );
}
