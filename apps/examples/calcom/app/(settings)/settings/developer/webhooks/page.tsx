import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import { WebhooksEmpty } from "./webhooks-empty";

export default function WebhooksSettingsPage() {
  const webhooks: { id: string; url: string; events: string }[] = [];

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Webhooks">
          <AppHeaderDescription>
            Receive meeting data in real-time when something happens in Cal.com.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <WebhooksEmpty webhooks={webhooks} />
    </>
  );
}
