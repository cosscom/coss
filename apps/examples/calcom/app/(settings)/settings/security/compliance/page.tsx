import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import { ComplianceDocuments } from "./compliance-documents";

export default function ComplianceSettingsPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Compliance</CardFrameTitle>
          <CardFrameDescription>
            Download and manage your compliance documents
          </CardFrameDescription>
        </CardFrameHeader>

        <Card>
          <CardPanel>
            <ComplianceDocuments />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
