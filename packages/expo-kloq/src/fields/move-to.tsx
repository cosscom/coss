import { Column, Host, Text, TextInput } from "@expo/ui";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useKloqSettings } from "../settings-context.tsx";
import type { CalEvent, MoveTarget } from "../shared.ts";
import { describeMove, parseInstant, parseMoveTarget } from "../shared.ts";

export interface MoveToInputProps {
  value: string;
  onValueChange: (value: string) => void;
  event: CalEvent;
  now: Date;
  onCommit: (target: MoveTarget) => void;
  onBack: () => void;
  autoFocus?: boolean;
  announce?: boolean;
}

/** "Move this event to…" field. Must render inside `<Kloq>`. */
export function MoveToInput({
  value,
  onValueChange,
  event,
  now,
  onCommit,
  onBack,
  autoFocus = true,
  announce = true,
}: MoveToInputProps) {
  const settings = useKloqSettings();
  const allDay = event.allDay === true;
  const target = useMemo(() => {
    const read = (instant: string) =>
      allDay ? new Date(parseInstant(instant)) : new Date(settings.toDisplay(instant));
    const current = { start: read(event.start), end: read(event.end) };
    return parseMoveTarget(value, { ...current, allDay }, now);
  }, [value, event.start, event.end, allDay, now, settings]);
  const preview = target
    ? describeMove(target, (date) =>
        date.toLocaleString(settings.locale, {
          month: "short",
          day: "numeric",
          hour: allDay ? undefined : "numeric",
          minute: allDay ? undefined : "2-digit",
          hour12: settings.hour12,
        }),
      )
    : "Couldn't read that";
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    if (!announce) return;
    const timer = setTimeout(() => setSpoken(preview), 700);
    return () => clearTimeout(timer);
  }, [preview, announce]);
  useEffect(() => {
    if (spoken) void AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column spacing={6}>
        <TextInput
          defaultValue={value}
          autoFocus={autoFocus}
          placeholder="Tomorrow at 3pm"
          onChangeText={onValueChange}
          onSubmitEditing={() => {
            if (target) onCommit(target);
            else if (value.trim().length === 0) onBack();
          }}
        />
        <Text textStyle={{ fontSize: 13 }}>{preview}</Text>
      </Column>
    </Host>
  );
}
