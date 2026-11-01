import { Button, Column, Host, RNHostView, Row, Spacer, Text } from "@expo/ui";
import type { ReactNode } from "react";
import { type KloqChrome, useKloq } from "./chrome-context.tsx";
import { GlassBar } from "./platform/glass.tsx";
import { SegmentedViews, type ViewOption } from "./platform/view-switcher.tsx";
import { useKloqSettings } from "./settings-context.tsx";
import { formatViewTitle, type KloqView } from "./shared.ts";

export interface KloqToolbarProps {
  children?: ReactNode;
}

const WORDS = ["day", "week", "month", "agenda", "year", "timeline"] as const;

export function viewOptions(chrome: Pick<KloqChrome, "timeline" | "viewSetting">): ViewOption[] {
  const options: ViewOption[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "agenda", label: "Agenda" },
    { value: "year", label: "Year" },
  ];
  if (typeof chrome.viewSetting === "number") {
    options.splice(2, 0, {
      value: String(chrome.viewSetting),
      label: `${chrome.viewSetting} days`,
    });
  }
  if (chrome.timeline) options.push({ value: "timeline", label: "Timeline" });
  return options;
}

export function parseViewToken(value: string): KloqView {
  if ((WORDS as readonly string[]).includes(value)) return value as KloqView;
  const span = Number(value);
  return Number.isFinite(span) ? span : "week";
}

/** App bar. The default contents are nav on the left and Reset on the right. */
export function KloqToolbar({ children }: KloqToolbarProps) {
  const chrome = useKloq();
  return (
    <GlassBar
      scheme={chrome.scheme}
      style={{ borderRadius: 20, marginHorizontal: 12, marginTop: 8 }}
    >
      <Host
        matchContents={{ vertical: true }}
        style={{ width: "100%" }}
        colorScheme={chrome.scheme}
      >
        {children ?? (
          <Row alignment="center" spacing={8} style={{ padding: 8 }}>
            <KloqNav />
            <Spacer flexible />
            <KloqReset />
          </Row>
        )}
      </Host>
    </GlassBar>
  );
}

export function KloqNav() {
  const chrome = useKloq();
  const settings = useKloqSettings();
  const options = viewOptions(chrome);
  const value = options.some((option) => option.value === String(chrome.viewSetting))
    ? String(chrome.viewSetting)
    : "week";
  return (
    <Column spacing={6}>
      <Text textStyle={{ fontSize: 20, fontWeight: "700" }}>
        {formatViewTitle(chrome.view, settings.locale)}
      </Text>
      <Row alignment="center" spacing={6}>
        <Button variant="outlined" label="Back" onPress={() => chrome.step(-1)} />
        <Button
          variant={chrome.atToday ? "text" : "filled"}
          label="Today"
          onPress={chrome.goToday}
        />
        <Button variant="outlined" label="Next" onPress={() => chrome.step(1)} />
        {chrome.canCommand ? (
          <Button variant="text" label="New" onPress={chrome.openCommand} />
        ) : null}
      </Row>
      <RNHostView matchContents={{ vertical: true }}>
        <SegmentedViews
          options={options}
          value={value}
          onChange={(next) => chrome.switchView(parseViewToken(next))}
        />
      </RNHostView>
    </Column>
  );
}

export function KloqReset() {
  const chrome = useKloq();
  return <Button variant="text" label="Reset" onPress={chrome.reset} />;
}
