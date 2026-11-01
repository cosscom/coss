import { Platform } from "react-native";
import { ScopeDialog as AndroidScope } from "../platform/scope-dialog-android.tsx";
import { ScopeDialog as IosScope } from "../platform/scope-dialog-ios.tsx";
import type { RecurrenceScope } from "../shared.ts";
import type { RecurrenceScopeAction } from "./scope-types.ts";

export interface RecurrenceScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: RecurrenceScopeAction;
  title?: string;
  summary?: string;
  onChoose: (scope: RecurrenceScope) => void;
  onCancel?: () => void;
  scopes?: readonly RecurrenceScope[];
}

/** iOS confirmation dialog, Android modal bottom sheet. */
export function RecurrenceScopeDialog({
  open,
  onOpenChange,
  action,
  title,
  summary,
  onChoose,
  onCancel,
  scopes = ["this", "following", "all"],
}: RecurrenceScopeDialogProps) {
  const heading =
    title ?? (action === "delete" ? "Delete recurring event" : "Change recurring event");
  const choose = (scope: RecurrenceScope) => {
    onChoose(scope);
    onOpenChange(false);
  };
  const change = (next: boolean) => {
    if (!next) onCancel?.();
    onOpenChange(next);
  };
  if (Platform.OS === "ios") {
    return (
      <IosScope
        open={open}
        title={heading}
        summary={summary}
        action={action}
        scopes={scopes}
        onOpenChange={change}
        onChoose={choose}
      />
    );
  }
  return (
    <AndroidScope
      open={open}
      title={heading}
      summary={summary}
      action={action}
      scopes={scopes}
      onOpenChange={change}
      onChoose={choose}
    />
  );
}
