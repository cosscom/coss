import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import { AutoOptInToggle, FeaturesList } from "./features-list";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function FeaturesPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Features">
          <AppHeaderDescription>
            Manage experimental features for your account
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <CardFrame>
          <Card>
            <CardPanel>
              <FeaturesList />
            </CardPanel>
          </Card>
        </CardFrame>

        <AutoOptInToggle />
      </div>
    </>
  );
}
