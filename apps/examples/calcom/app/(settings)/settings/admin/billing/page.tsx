import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function AdminBillingPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Admin billing">
          <AppHeaderDescription>
            Manage billing emails and Stripe portal access for licenses.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>Billing portal</CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel className="flex flex-col items-start gap-4">
              <p className="text-muted-foreground text-sm">
                Open the Stripe billing portal for this license.
              </p>
              <Button>Open billing portal</Button>
            </CardPanel>
          </Card>
        </CardFrame>
      </div>
    </>
  );
}
