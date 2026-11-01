import { DateTimePicker, Host } from "@expo/ui/jetpack-compose";

/** Material 3 date or time picker. `initialDate` is read when the picker mounts. */
export function NativeDateField({
  value,
  onChange,
  mode,
}: {
  value: Date;
  onChange: (date: Date) => void;
  mode: "date" | "time";
  /** Matched with the iOS picker's title. Material draws its own title. */
  title: string;
}) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <DateTimePicker
        displayedComponents={mode === "time" ? "hourAndMinute" : "date"}
        initialDate={value.toISOString()}
        variant={mode === "time" ? "picker" : "input"}
        showTitle
        onDateSelected={onChange}
      />
    </Host>
  );
}
