import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

import { ComplianceDocuments } from "./compliance-documents";

export default function ComplianceSettingsPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Compliance">
          <AppHeaderDescription>
            Download and manage your compliance documents
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <CardFrame>
        <Card>
          <CardPanel>
            <ComplianceDocuments />
          </CardPanel>
        </Card>
      </CardFrame>
    </>
  );
}
