import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { NewOAuthClientDialog } from "./new-oauth-client-dialog";
import { OAuthEmpty } from "./oauth-empty";

export default function OAuthSettingsPage() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>OAuth Clients</CardFrameTitle>
        <CardFrameDescription>
          Create and manage OAuth clients for third-party integrations
        </CardFrameDescription>
        <CardFrameAction>
          <NewOAuthClientDialog />
        </CardFrameAction>
      </CardFrameHeader>

      <Card>
        <CardPanel className="p-0">
          <OAuthEmpty />
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
