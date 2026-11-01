import { Button, Column, Host, Picker, Row, Text, TextInput } from "@expo/ui";
import { useMemo, useState } from "react";
import {
  PRESET_IDS,
  type PresetOptions,
  parseRRule,
  presetIdFor,
  presetsFor,
  type RRuleFreq,
  type RRuleParts,
  type RRuleWeekday,
  serializeRRule,
  WEEKDAY_CODES,
} from "../shared.ts";

export interface RRuleBuilderProps {
  value?: string;
  date: Date;
  onChange: (rule: string | undefined) => void;
  readOnly?: boolean;
  describeOptions?: PresetOptions;
}

const FREQS: readonly RRuleFreq[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

/** Recurrence menu. Presets are a native picker; Custom opens interval and weekday controls. */
export function RRuleBuilder({
  value,
  date,
  onChange,
  readOnly = false,
  describeOptions,
}: RRuleBuilderProps) {
  const presets = useMemo(() => presetsFor(date, describeOptions), [date, describeOptions]);
  const selected = presetIdFor(value, date);
  const [custom, setCustom] = useState(selected === "custom");
  const parts = value ? parseRRule(value) : null;
  if (readOnly) {
    const label =
      presets.find((preset) => preset.id === selected)?.label ?? value ?? "Does not repeat";
    return (
      <Host matchContents>
        <Text>{label}</Text>
      </Host>
    );
  }
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Column spacing={8}>
        <Picker
          selectedValue={custom ? "custom" : selected}
          onValueChange={(next) => {
            const id = String(next);
            if (id === "custom") {
              setCustom(true);
              if (!parts)
                onChange(
                  serializeRRule({
                    freq: "WEEKLY",
                    byDay: [{ weekday: WEEKDAY_CODES[date.getDay()] ?? "MO" }],
                  }),
                );
              return;
            }
            setCustom(false);
            const preset = presets.find((item) => item.id === id);
            onChange(preset?.rule ?? undefined);
          }}
        >
          {PRESET_IDS.map((id) => {
            const preset = presets.find((item) => item.id === id);
            if (!preset) return null;
            return <Picker.Item key={id} label={preset.label} value={id} />;
          })}
        </Picker>
        {custom ? <CustomRule parts={parts} date={date} onChange={onChange} /> : null}
      </Column>
    </Host>
  );
}

function CustomRule({
  parts,
  date,
  onChange,
}: {
  parts: RRuleParts | null;
  date: Date;
  onChange: (rule: string | undefined) => void;
}) {
  const current: RRuleParts = parts ?? {
    freq: "WEEKLY",
    byDay: [{ weekday: WEEKDAY_CODES[date.getDay()] ?? "MO" }],
  };
  const commit = (next: RRuleParts) => onChange(serializeRRule(next));
  const days = new Set((current.byDay ?? []).map((day) => day.weekday));
  return (
    <Column spacing={8}>
      <Picker
        selectedValue={current.freq}
        onValueChange={(freq) => commit({ ...current, freq: freq as RRuleFreq })}
      >
        {FREQS.map((freq) => (
          <Picker.Item key={freq} label={freq[0] + freq.slice(1).toLowerCase()} value={freq} />
        ))}
      </Picker>
      <TextInput
        defaultValue={String(current.interval ?? 1)}
        keyboardType="number-pad"
        placeholder="Interval"
        onChangeText={(text) => {
          const interval = Number.parseInt(text, 10);
          if (interval > 0) commit({ ...current, interval });
        }}
      />
      <Row spacing={4}>
        {WEEKDAY_CODES.map((code) => (
          <Button
            key={code}
            variant={days.has(code) ? "filled" : "outlined"}
            label={code}
            onPress={() => commit({ ...current, byDay: toggleDay(current, code) })}
          />
        ))}
      </Row>
    </Column>
  );
}

function toggleDay(parts: RRuleParts, weekday: RRuleWeekday): { weekday: RRuleWeekday }[] {
  const days = new Set((parts.byDay ?? []).map((day) => day.weekday));
  if (days.has(weekday)) days.delete(weekday);
  else days.add(weekday);
  return WEEKDAY_CODES.filter((code) => days.has(code)).map((code) => ({ weekday: code }));
}
