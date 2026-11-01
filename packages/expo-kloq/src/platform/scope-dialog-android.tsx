import { BottomSheet, Button, Column, Host, Text } from "@expo/ui";
import type { RecurrenceScope } from "../shared.ts";

const LABEL: Record<RecurrenceScope, string> = {
  this: "This event",
  following: "This and following",
  all: "All events",
};

/**
 * Material has no three-action alert. A modal bottom sheet is the sheet
 * Compose uses for a list of choices.
 */
export function ScopeDialog({
  open,
  title,
  summary,
  scopes,
  onOpenChange,
  onChoose,
}: {
  open: boolean;
  title: string;
  summary?: string;
  action: "edit" | "delete";
  scopes: readonly RecurrenceScope[];
  onOpenChange: (open: boolean) => void;
  onChoose: (scope: RecurrenceScope) => void;
}) {
  return (
    <BottomSheet isPresented={open} onDismiss={() => onOpenChange(false)}>
      <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
        <Column spacing={8}>
          <Text textStyle={{ fontSize: 18, fontWeight: "700" }}>{title}</Text>
          {summary ? <Text textStyle={{ fontSize: 14 }}>{summary}</Text> : null}
          {scopes.map((scope) => (
            <Button key={scope} label={LABEL[scope]} onPress={() => onChoose(scope)} />
          ))}
          <Button variant="text" label="Cancel" onPress={() => onOpenChange(false)} />
        </Column>
      </Host>
    </BottomSheet>
  );
}
