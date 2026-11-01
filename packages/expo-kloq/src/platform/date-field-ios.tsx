import { DatePicker, Host } from "@expo/ui/swift-ui";

/** SwiftUI graphical date or time picker. */
export function NativeDateField({
  value,
  onChange,
  mode,
  title,
}: {
  value: Date;
  onChange: (date: Date) => void;
  mode: "date" | "time";
  title: string;
}) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <DatePicker
        title={title}
        selection={value}
        displayedComponents={mode === "time" ? ["hourAndMinute"] : ["date"]}
        onDateChange={onChange}
      />
    </Host>
  );
}
