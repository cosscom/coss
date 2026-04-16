import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function OrganizationDirectorySyncPage() {
  return (
    <AppHeader>
      <AppHeaderContent title="Directory sync">
        <AppHeaderDescription>
          Provision and de-provision users with your directory provider.
        </AppHeaderDescription>
      </AppHeaderContent>
    </AppHeader>
  );
}
