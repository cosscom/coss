import { Button, ConfirmationDialog, Host, Text } from "@expo/ui/swift-ui";
import type { RecurrenceScope } from "../shared.ts";

const LABEL: Record<RecurrenceScope, string> = {
  this: "This event",
  following: "This and following",
  all: "All events",
};

/** iOS action sheet. */
export function ScopeDialog({
  open,
  title,
  summary,
  action: _action,
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
    <Host matchContents>
      <ConfirmationDialog
        title={title}
        isPresented={open}
        onIsPresentedChange={onOpenChange}
        titleVisibility="visible"
      >
        <ConfirmationDialog.Trigger>
          <Button label={title} onPress={() => onOpenChange(true)} />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          {scopes.map((scope) => (
            <Button key={scope} label={LABEL[scope]} onPress={() => onChoose(scope)} />
          ))}
          <Button label="Cancel" onPress={() => onOpenChange(false)} />
        </ConfirmationDialog.Actions>
        {summary ? (
          <ConfirmationDialog.Message>
            <Text>{summary}</Text>
          </ConfirmationDialog.Message>
        ) : null}
      </ConfirmationDialog>
    </Host>
  );
}
