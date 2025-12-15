import { AppSidebar } from "@/components/app-sidebar";
import { EventTypes } from "@/components/event-types";
import { MobileFooter } from "@/components/mobile-footer";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <MobileHeader />
      <AppSidebar />
      <SidebarInset className="max-md:pt-14">
        <EventTypes />
      </SidebarInset>
      <MobileFooter />
    </SidebarProvider>
  );
}
