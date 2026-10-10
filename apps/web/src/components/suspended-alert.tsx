import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";

/** Shown to members while a platform admin has the organization suspended. */
export function SuspendedAlert() {
  return (
    <Alert variant="error">
      <AlertTitle>This organization is suspended</AlertTitle>
      <AlertDescription>
        Its API keys are refused, webhook deliveries are on hold and changes are disabled. You can
        still view its data. Contact support to resolve the suspension.
      </AlertDescription>
    </Alert>
  );
}
