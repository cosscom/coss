import { FlagAdminList } from "./flag-admin-list";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

export default function AdminFlagsPage() {
  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Feature flags">
          <AppHeaderDescription>
            Manage killswitches and feature flags for your instance
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <FlagAdminList />
    </>
  );
}
