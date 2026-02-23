import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrameDescription,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ExternalLinkIcon } from "lucide-react";
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
        <Card>
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardFrameTitle>Manage billing</CardFrameTitle>
                <CardFrameDescription>
                  Open the Stripe billing portal for this license.
                </CardFrameDescription>
              </div>
              <Button>
                Billing portal
                <ExternalLinkIcon aria-hidden="true" />
              </Button>
            </div>
          </CardPanel>
        </Card>
      </div>
    </>
  );
}
