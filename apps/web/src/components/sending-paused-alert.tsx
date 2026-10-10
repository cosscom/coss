import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";

/** Shown while the organization's provider tenant is paused (reputation enforcement). */
export function SendingPausedAlert({ cause }: { cause: string | null }) {
  return (
    <Alert variant="error">
      <AlertTitle>Sending is paused</AlertTitle>
      <AlertDescription>
        Live emails from this organization are refused because of its sending reputation (high
        bounce or complaint rates).{cause ? ` ${cause}` : ""} Contact support to resume sending.
      </AlertDescription>
    </Alert>
  );
}
