import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { AutoOptInToggle, FeaturesList } from "./features-list";

export default function FeaturesPage() {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Features</CardFrameTitle>
          <CardFrameDescription>
            Manage experimental features for your account
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel>
            <FeaturesList />
          </CardPanel>
        </Card>
      </CardFrame>

      <AutoOptInToggle />
    </div>
  );
}
