import {
  Host,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from "@expo/ui/jetpack-compose";
import type { ViewOption } from "./view-switcher-ios.tsx";

export type { ViewOption };

/** Material 3 single-choice segmented button row. */
export function SegmentedViews({
  options,
  value,
  onChange,
}: {
  options: readonly ViewOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <SingleChoiceSegmentedButtonRow>
        {options.map((option) => (
          <SegmentedButton
            key={option.value}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
          >
            <SegmentedButton.Label>
              <Text>{option.label}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
