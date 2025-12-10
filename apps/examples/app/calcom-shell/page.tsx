import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { EventTypes } from "@/components/event-types"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <EventTypes />
      </SidebarInset>
    </SidebarProvider>
  )
}
