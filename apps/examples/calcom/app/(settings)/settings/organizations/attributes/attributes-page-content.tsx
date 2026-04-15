import type { AttributeItem } from "./attributes-section";
import { AttributesSection } from "./attributes-section";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export type { AttributeItem };

interface AttributesPageContentProps {
  attributes: AttributeItem[];
}

export function AttributesPageContent({
  attributes,
}: AttributesPageContentProps) {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Attributes">
          <AppHeaderDescription>
            Manage attributes for your team members
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <AttributesSection attributes={attributes} />
    </>
  );
}
