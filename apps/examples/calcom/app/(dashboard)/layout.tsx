"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileFooter } from "@/components/mobile-footer";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <MobileHeader />
      <AppSidebar />
      <SidebarInset className="max-md:pt-14">{children}</SidebarInset>
      <MobileFooter />
    </SidebarProvider>
  );
}
