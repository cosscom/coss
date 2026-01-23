"use client";

import { AppMobileFooter } from "@/components/app/app-mobile-footer";
import { AppMobileHeader } from "@/components/app/app-mobile-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppMobileHeader />
      <AppSidebar />
      <SidebarInset className="max-md:pt-14">{children}</SidebarInset>
      <AppMobileFooter />
    </SidebarProvider>
  );
}
