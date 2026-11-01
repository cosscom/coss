import { Column, Host, Text, TextInput } from "@expo/ui";
import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  highlightSegments,
  type QuickAddResult,
  type QuickAddSegment,
  quickAddPreview,
} from "../shared.ts";

const SPEAK_AFTER_MS = 700;

function useSpoken(text: string, enabled: boolean): string {
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setSpoken(text), SPEAK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [text, enabled]);
  return enabled ? spoken : "";
}

export interface QuickAddInputProps {
  value: string;
  onValueChange: (value: string) => void;
  result: QuickAddResult;
  now: Date;
  onCommit: () => void;
  onBack?: () => void;
  autoFocus?: boolean;
  announce?: boolean;
}

/** Natural-language quick add. The preview is announced with the platform screen reader. */
export function QuickAddInput({
  value,
  onValueChange,
  result,
  now,
  onCommit,
  onBack,
  autoFocus = true,
  announce = true,
}: QuickAddInputProps) {
  const segments: QuickAddSegment[] = useMemo(
    () =>
      result.confidence === "none"
        ? [{ text: value, kind: null }]
        : highlightSegments(value, result.tokens, result.ignored),
    [value, result],
  );
  const preview = useMemo(() => quickAddPreview(result, now), [result, now]);
  const ignored = result.ignored.map((token) => token.text).join(", ");
  const spoken = useSpoken(
    value.trim().length > 0
      ? [preview.title, preview.when, ...preview.chips, ignored && `ignored: ${ignored}`]
          .filter(Boolean)
          .join(", ")
      : "",
    announce,
  );
  useEffect(() => {
    if (spoken) void AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column spacing={6}>
        <TextInput
          defaultValue={value}
          autoFocus={autoFocus}
          placeholder="Lunch tomorrow at 1pm"
          onChangeText={onValueChange}
          onSubmitEditing={(text) => {
            if (text.trim().length === 0) onBack?.();
            else onCommit();
          }}
        />
        <Text textStyle={{ fontSize: 13 }}>
          {segments.map((segment) => segment.text).join("") || preview.when || " "}
        </Text>
        {preview.when ? <Text textStyle={{ fontSize: 13 }}>{preview.when}</Text> : null}
      </Column>
    </Host>
  );
}
