import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

export interface ViewOption {
  value: string;
  label: string;
}

/** iOS segmented control — SwiftUI `Picker` with `pickerStyle(.segmented)`. */
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
      <Picker
        selection={value}
        onSelectionChange={(next) => {
          if (typeof next === "string") onChange(next);
        }}
        modifiers={[pickerStyle("segmented")]}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
