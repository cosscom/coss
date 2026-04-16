import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrameDescription,
  CardPanel,
} from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function OrganizationDirectorySyncPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Directory sync">
          <AppHeaderDescription>
            Provision and de-provision users with your directory provider.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <Card>
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardFrameDescription>
                  Configure an identity provider to get started with SCIM.
                </CardFrameDescription>
              </div>
              <Button type="button">Configure</Button>
            </div>
          </CardPanel>
        </Card>
      </div>
    </>
  );
}
