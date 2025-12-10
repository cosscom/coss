import { AppSidebar } from "@/components/app-sidebar";
import { EventTypes } from "@/components/event-types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <EventTypes />
      </SidebarInset>
    </SidebarProvider>
  );
}
